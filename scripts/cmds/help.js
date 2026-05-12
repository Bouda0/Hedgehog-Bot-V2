const fs = require("fs-extra");
const axios = require("axios");
const path = require("path");
const { getPrefix } = global.utils;
const { commands, aliases } = global.GoatBot;
const doNotDelete = "➤『 𝐏𝐑𝐎𝐉𝐄𝐓 𝐃𝐄𝐗𝐓𝐄𝐔𝐑 』☜ヅ\n";

function formatFont(text) {
  const fontMapping = {
    A: "𝐀", B: "𝐁", C: "𝐂", D: "𝐃", E: "𝐄", F: "𝐅", G: "𝐆", H: "𝐇", I: "𝐈", J: "𝐉", K: "𝐊", L: "𝐋", M: "𝐌",
    N: "𝐍", O: "𝐎", P: "𝐏", Q: "𝐐", R: "𝐑", S: "𝐒", T: "𝐓", U: "𝐔", V: "𝐕", W: "𝐖", X: "𝐗", Y: "𝐘", Z: "𝐙",
    1: "𝟏", 2: "𝟐", 3: "𝟑", 4: "𝟒", 5: "𝟓", 6: "𝟔", 7: "𝟕", 8: "𝟖", 9: "𝟗", 0: "𝟎"
  };
  return text.split('').map(char => fontMapping[char.toUpperCase()] || char).join('');
}

function formatFonts(text) {
  const fontList = {
    a: "𝚊", b: "𝚋", c: "𝚌", d: "𝚍", e: "𝚎", f: "𝚏", g: "𝚐", h: "𝚑", i: "𝚒", j: "𝚓", k: "𝚔", l: "𝚕", m: "𝚖",
    n: "𝚗", o: "𝚘", p: "𝚙", q: "𝚚", r: "𝚛", s: "𝚜", t: "𝚝", u: "𝚞", v: "𝚟", w: "𝚠", x: "𝚡", y: "𝚢", z: "𝚣",
    1: "𝟷", 2: "𝟸", 3: "𝟹", 4: "𝟺", 5: "𝟻", 6: "𝟼", 7: "𝟽", 8: "𝟾", 9: "𝟿", 0: "𝟶"
  };
  return text.split('').map(char => fontList[char.toLowerCase()] || char).join('');
}

module.exports = {
  config: {
    name: "help",
    version: "1.20",
    author: "Raphael Scholar × Gerald Max",
    countDown: 9,
    role: 0,
    shortDescription: {
      en: "View command usage and list"
    },
    longDescription: {
      en: "View detailed command usage and list all available commands"
    },
    category: "info",
    guide: {
      en: "{pn} [command_name]"
    },
    priority: 1
  },

  onStart: async function ({ message, args, event, threadsData, role }) {
    const { threadID } = event;
    const prefix = await getPrefix(threadID);

    if (args.length === 0) {
      const categories = {};
      let msg = ``;

      for (const [name, value] of commands) {
        if (value.config.role > role) continue;
        const category = value.config.category || "NO CATEGORY";
        if (!categories[category]) {
          categories[category] = { commands: [] };
        }
        categories[category].commands.push(name);
      }

      Object.keys(categories).sort().forEach(category => {
        const formattedCategory = formatFont(category.toUpperCase());
        msg += `\n━━━━━━━━━━━━━━\n│🌱 🩸☞ ${formattedCategory} ☜🩸 🌱\n`;

        const names = categories[category].commands.sort();
        for (let i = 0; i < names.length; i++) {
          const formattedCmd = formatFonts(names[i]);
          msg += `│💰| ${formattedCmd}\n`;
        }

        msg += `━━━━━━━━━━━━━━\n`;
      });

      const totalCommands = commands.size;
      msg += `🌱 🩸☞ 💰 | 𝐄𝐍𝐉𝐎𝐘 ☜🩸 🌱\n`;
      msg += `│» 𝙲𝚞𝚛𝚛𝚎𝚗𝚝𝚕𝚢 𝚝𝚑𝚒𝚜 𝚋𝚘𝚝 𝚑𝚊𝚜 \n│『 ${totalCommands} 』𝚌𝚘𝚖𝚖𝚊𝚗𝚍𝚜 𝚝𝚑𝚊𝚝 𝚌-\n│-𝚊𝚗 𝚋𝚎 𝚞𝚜𝚎𝚍\n`;
      msg += `│» 𝚃𝚢𝚙𝚎 ( ${prefix}help 𝘤𝘮𝘥_𝘯𝘢𝘮𝘦 )\n│𝚃𝚘 𝚟𝚒𝚎𝚠 𝚍𝚎𝚝𝚊𝚒𝚕𝚜\n│𝚘𝚏 𝚑𝚘𝚠 𝚝𝚘 𝚞𝚜𝚎\n`;
      msg += `│» 𝚃𝚢𝚙𝚎 ( ${prefix}𝚜𝚞𝚙𝚙𝚘𝚛𝚝𝚐𝚌 𝚝𝚘\n│𝚝𝚘 𝚐𝚎𝚝 𝚊𝚍𝚍𝚎𝚍 𝚝𝚘 𝚖𝚢\n│𝚍𝚎𝚟𝚜 𝙶𝚛𝚘𝚞𝚙 𝚌𝚑𝚊𝚝 )\n`;
      msg += `━━━━━━━━━━━━━━\n`;
      msg += `━━━━━━━━━━━━━━\n`;
      msg += `│ ${doNotDelete}`;
      msg += `━━━━━━━━━━━━━━`;

      await message.reply({ body: msg });
    } else {
      const commandName = args[0].toLowerCase();
      const command = commands.get(commandName) || commands.get(aliases.get(commandName));

      if (!command) {
        await message.reply(`Command "${commandName || "undefined"}" not found.`);
      } else {
        const configCommand = command.config;
        const roleText = roleTextToString(configCommand.role);
        const author = configCommand.author || "Unknown";

        const longDescription = configCommand.longDescription?.en || "No description";
        const guideBody = configCommand.guide?.en || "No guide available.";
        const usage = guideBody.replace(/{p}/g, prefix).replace(/{n}/g, configCommand.name);

        const response = `🌱 🩸☞ NAME ☜🩸 🌱
🥷✨ ${configCommand.name} 🦠 ✰✰ 
🌱 🩸☞ INFO ☜🩸 🌱
│ Description: ${longDescription}
│ Other names: ${configCommand.aliases ? configCommand.aliases.join(", ") : "None"}
│ Version: ${configCommand.version || "1.0"}
│ Role: ${roleText}
│ Cooldown: ${configCommand.countDown || 2}s
│ Author: ${author}
🌱 🩸☞ Usage☜🩸 🌱
💰 ${usage}
🌱 🩸☞ Notes☜🩸 🌱
💰 The content inside <XXXXX> can be changed
💰 The content inside [a|b|c] is a or b or c
━━━━━━━━━━━━━━`;

        await message.reply(response);
      }
    }
  }
};

function roleTextToString(roleText) {
  switch (roleText) {
    case 0: return "0 (All users)";
    case 1: return "1 (Group administrators)";
    case 2: return "2 (Admin bot)";
    default: return "Unknown role";
  }
}
