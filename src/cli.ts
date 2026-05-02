import { chatSendAndPoll } from "./commands/chat.js";
import { loginInteractive, loginCli, loginWeb, logout } from "./commands/login.js";
import { doImage } from "./commands/image.js";
import {
  doAccount,
  doConversations,
  doNew,
  doLast,
  doRetry,
  doLoad,
  doDelete,
  doDaemon,
  doStop,
} from "./commands/misc.js";

const MODE_COMMANDS = new Set([
  "translate",
  "writing",
  "ppt",
  "coding",
  "video",
  "music",
  "podcast",
  "math",
  "data",
  "super",
]);

function showHelp(): void {
  console.log(`doubao-cli — Doubao AI CLI tool

Usage: doubao-cli <command> [args...]

Login:
  doubao-cli login                      Interactive login (phone + code)
  doubao-cli login <phone>              Send verification code
  doubao-cli login <phone> <code>       Send code and login
  doubao-cli login --web                Open browser for manual login
  doubao-cli logout                     Logout

Chat:
  doubao-cli chat 'hello'                                  Normal chat
  doubao-cli chat --thinking quick '...'                    Quick mode (default)
  doubao-cli chat --thinking think '...'                    Think mode
  doubao-cli chat --thinking expert '...'                   Expert mode

Mode commands:
  doubao-cli translate --to-english '你好世界'              Chinese to English
  doubao-cli translate --to-chinese 'Hello World'           English to Chinese
  doubao-cli coding 'write quicksort in python'             Coding assistant
  doubao-cli math 'prove Taylor theorem'                    Math problem solver
  doubao-cli image 'draw a cat'                             Image generation
  doubao-cli ppt 'AI development history'                   PPT generation
  doubao-cli writing 'write a self introduction'             Writing assistant
  doubao-cli video 'Big Bang'                                Video generation
  doubao-cli music 'Piggy song'                              Music generation
  doubao-cli podcast 'Latest Linux kernel CVE'               AI podcast
  doubao-cli data 'sort: 4,6,2,12,5'                        Data analysis
  doubao-cli super 'research vibe coding'                    Super mode

Session:
  doubao-cli list                      List conversations
  doubao-cli load <ID>                 Load conversation
  doubao-cli new                       New conversation
  doubao-cli last                      Latest response
  doubao-cli retry                     Regenerate last response
  doubao-cli delete <ID>               Delete conversation

System:
  doubao-cli account                   Account info
  doubao-cli daemon                    Daemon status
  doubao-cli stop                      Stop daemon`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const cmd = args[0] || "help";

  try {
    switch (cmd) {
      case "help":
      case "--help":
      case "-h":
        showHelp();
        break;

      case "login":
        if (args[1] === "--web") {
          await loginWeb();
        } else if (args[1] === "--interactive" || args.length === 1) {
          await loginInteractive();
        } else {
          await loginCli(args[1], args[2]);
        }
        break;

      case "logout":
        await logout();
        break;

      case "chat": {
        let thinking = "";
        const msgParts: string[] = [];
        for (let i = 1; i < args.length; i++) {
          if (args[i] === "--thinking" && i + 1 < args.length) {
            thinking = args[++i];
          } else {
            msgParts.push(args[i]);
          }
        }
        const msg = msgParts.join(" ");
        if (!msg) {
          console.log("Usage: doubao-cli chat [--thinking quick|think|expert] <message>");
          process.exit(1);
        }
        await chatSendAndPoll(msg, "", thinking);
        break;
      }

      case "image": {
        const msg = args.slice(1).join(" ");
        if (!msg) {
          console.log("Usage: doubao-cli image <description>");
          process.exit(1);
        }
        await doImage(msg);
        break;
      }

      case "account":
        await doAccount();
        break;

      case "list":
      case "conversations":
        await doConversations();
        break;

      case "last":
      case "last-response":
        await doLast();
        break;

      case "retry":
      case "regenerate":
        await doRetry();
        break;

      case "new":
        await doNew();
        break;

      case "load":
        await doLoad(args[1]);
        break;

      case "delete":
        await doDelete(args[1]);
        break;

      case "daemon":
        await doDaemon();
        break;

      case "stop":
        await doStop();
        break;

      default:
        if (MODE_COMMANDS.has(cmd)) {
          let translateTarget = "";
          const msgParts: string[] = [];
          for (let i = 1; i < args.length; i++) {
            if (args[i] === "--to-english") translateTarget = "english";
            else if (args[i] === "--to-chinese") translateTarget = "chinese";
            else msgParts.push(args[i]);
          }
          const msg = msgParts.join(" ");
          if (!msg) {
            console.log(`Usage: doubao-cli ${cmd} [--to-english|--to-chinese] <content>`);
            process.exit(1);
          }
          if (cmd === "translate" && !translateTarget) {
            console.log("Error: translate requires a target language");
            console.log("  --to-english    Translate to English");
            console.log("  --to-chinese    Translate to Chinese");
            console.log("");
            console.log("Example: doubao-cli translate --to-english 你好世界");
            process.exit(1);
          }
          await chatSendAndPoll(msg, cmd, "", translateTarget);
        } else {
          console.log(`Unknown command: ${cmd}`);
          console.log("Run doubao-cli --help for usage");
          process.exit(1);
        }
        break;
    }
  } catch (err: any) {
    console.error(err.message || err);
    process.exit(1);
  }
}

main();
