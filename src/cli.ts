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
  "solve",
  "data",
  "super",
]);

function showHelp(): void {
  console.log(`doubao-cli — 豆包 AI 命令行工具

用法: doubao-cli <命令> [参数...]

登录:
  doubao-cli login                        交互式登录（手机号+验证码）
  doubao-cli login <手机号>               发送验证码
  doubao-cli login <手机号> <验证码>      发送验证码并登录
  doubao-cli login --web                  打开浏览器手动登录
  doubao-cli logout                       退出登录

聊天:
  doubao-cli chat '你好'                                    普通对话
  doubao-cli chat --thinking quick '...'                    快速模式（默认）
  doubao-cli chat --thinking think '...'                    思考模式
  doubao-cli chat --thinking expert '...'                   专家模式

功能模式:
  doubao-cli translate --to-english '你好世界'              中译英
  doubao-cli translate --to-chinese 'Hello World'           英译中
  doubao-cli coding '用python写快排'                        编程助手
  doubao-cli solve '证明泰勒定理'                           解题答疑（支持各学科）
  doubao-cli image '画一只猫'                               图像生成
  doubao-cli ppt 'AI发展史'                                 PPT生成
  doubao-cli writing '写一份自我介绍'                        帮我写作
  doubao-cli video '宇宙大爆炸'                             视频生成
  doubao-cli music '猪猪之歌'                               音乐生成
  doubao-cli podcast 'linux内核最新漏洞'                    AI播客
  doubao-cli data '排序：4,6,2,12,5'                        数据分析
  doubao-cli super '研究vibe coding'                        超能模式

会话管理:
  doubao-cli list                     查看会话列表
  doubao-cli load <ID>                加载历史会话
  doubao-cli new                      新建会话
  doubao-cli last                     最新回复
  doubao-cli retry                    重新生成最新回复
  doubao-cli delete <ID>              删除会话

系统:
  doubao-cli account                  账户信息
  doubao-cli daemon                   daemon状态
  doubao-cli stop                     停止daemon`);
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
            console.log("错误: 翻译模式需要指定目标语言");
            console.log("  --to-english    翻译为英文");
            console.log("  --to-chinese    翻译为中文");
            console.log("");
            console.log("示例: doubao-cli translate --to-english 你好世界");
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
