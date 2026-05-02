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
  "research",
  "video",
  "music",
  "podcast",
  "meeting",
  "math",
  "data",
  "super",
]);

function showHelp(): void {
  console.log(`doubao-cli — Doubao AI CLI tool

Usage: doubao-cli <command> [args...]

Login:
  doubao-cli login                    Interactive login (phone + code)
  doubao-cli login <phone>            Send verification code
  doubao-cli login <phone> <code>     Login with code
  doubao-cli login --web              Browser login
  doubao-cli logout                   Logout

Chat:
  doubao-cli 'hello'                  Send message (auto-detect login)
  doubao-cli chat --mode coding 'write quicksort'
  doubao-cli chat --thinking expert '...'

Mode commands:
  doubao-cli translate 'hello'                  Translate (auto-detect)
  doubao-cli translate --to-english '你好'      Chinese to English
  doubao-cli translate --to-chinese 'Hello'     English to Chinese
  doubao-cli coding 'write quicksort'   Coding
  doubao-cli math 'solve equation'      Math
  doubao-cli image 'a cat'              Image
  doubao-cli ppt 'AI history'           PPT
  doubao-cli research '...'             Research
  doubao-cli writing '...'              Writing
  doubao-cli super '...'                Super mode
  (also: video music podcast meeting data)

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
  doubao-cli stop                      Stop Chrome daemon`);
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
        let mode = "";
        let thinking = "";
        const msgParts: string[] = [];
        for (let i = 1; i < args.length; i++) {
          if (args[i] === "--mode" && i + 1 < args.length) {
            mode = args[++i];
          } else if (args[i] === "--thinking" && i + 1 < args.length) {
            thinking = args[++i];
          } else {
            msgParts.push(args[i]);
          }
        }
        const msg = msgParts.join(" ");
        if (!msg) {
          console.log("Usage: doubao-cli chat <message>");
          process.exit(1);
        }
        await chatSendAndPoll(msg, mode, thinking);
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
        // Re-parse with options for catch-all mode
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
          await chatSendAndPoll(msg, cmd, "", translateTarget);
        } else {
          // Treat as quick chat message
          let thinking = "";
          let mode = "";
          const msgParts: string[] = [];
          for (let i = 0; i < args.length; i++) {
            if (args[i] === "--thinking" && i + 1 < args.length) {
              thinking = args[++i];
            } else if (args[i] === "--mode" && i + 1 < args.length) {
              mode = args[++i];
            } else {
              msgParts.push(args[i]);
            }
          }
          const msg = msgParts.join(" ");
          if (!msg) {
            console.log("Usage: doubao-cli [options] <message>");
            process.exit(1);
          }
          await chatSendAndPoll(msg, mode, thinking);
        }
        break;
    }
  } catch (err: any) {
    console.error(err.message || err);
    process.exit(1);
  }
}

main();
