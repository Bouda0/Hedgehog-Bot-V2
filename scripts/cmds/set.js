module.exports = {
  config: {
    name: "set",
    aliases: ['ap'],
    version: "1.0",
    author: "Samir B. Thakuri",
    role: 0,
    shortDescription: {
      en: " and experience points for a user"
    },
    longDescription: {
      en: "Set coins and experience points for a user as desired"
    },
    category: "economy",
    guide: {
      en: "{pn}set [money|exp] [amount]"
    }
  },

  onStart: async function ({ args, event, api, usersData }) {
    const permission = ["100092251751272"];
  if (!permission.includes(event.senderID)) {
    api.sendMessage("𝐆𝐚𝐠𝐧𝐞 𝐝𝐞 𝐥'𝐚𝐫𝐠𝐞𝐧𝐭 𝐜𝐨𝐦𝐦𝐞 𝐥𝐞𝐬 𝐚𝐮𝐭𝐫𝐞𝐬 𝐚𝐮 𝐥𝐢𝐞𝐮 𝐝𝐞 𝐭𝐫𝐢𝐜𝐡𝐞𝐫😴 \n\n𝐬𝐚𝐥𝐞 𝐝𝐞́𝐥𝐢𝐧𝐪𝐮𝐚𝐧𝐭(𝐞)🖕𝐣𝐞 𝐧'𝐚𝐜𝐜𝐞𝐩𝐭𝐞 𝐪𝐮𝐞 𝐦𝐨𝐧 𝐬𝐞𝐢𝐠𝐧𝐞𝐮𝐫 ✯𝗦𝗢𝗠𝗔 𝗗𝗘𝗫𝗘𝗧𝗨𝗥✯ 𝐥𝐮𝐢 𝐬𝐞𝐮𝐥 𝐩𝐞𝐮𝐭 𝐦𝐞 𝐝𝐨𝐧𝐧𝐞𝐫 𝐝𝐞𝐬 𝐨𝐫𝐝𝐫𝐞𝐬 😪", event.threadID, event.messageID);
    return;
  }
    const query = args[0];
    const amount = parseInt(args[1]);

    if (!query || !amount) {
      return api.sendMessage("Invalid command arguments. Usage: set [query] [amount]", event.threadID);
    }

    const { messageID, senderID, threadID } = event;

    if (senderID === api.getCurrentUserID()) return;

    let targetUser;
    if (event.type === "message_reply") {
      targetUser = event.messageReply.senderID;
    } else {
      const mention = Object.keys(event.mentions);
      targetUser = mention[0] || senderID;
    }

    const userData = await usersData.get(targetUser);
    if (!userData) {
      return api.sendMessage("User not found.", threadID);
    }

    const name = await usersData.getName(targetUser);

    if (query.toLowerCase() === 'exp') {
      await usersData.set(targetUser, {
        money: userData.money,
        exp: amount,
        data: userData.data
      });

      return api.sendMessage(`Set experience points to ${amount} for ${name}.`, threadID);
    } else if (query.toLowerCase() === 'money') {
      await usersData.set(targetUser, {
        money: amount,
        exp: userData.exp,
        data: userData.data
      });

      return api.sendMessage(`Set coins to ${amount} for ${name}.`, threadID);
    } else {
      return api.sendMessage("Invalid query. Use 'exp' to set experience points or 'money' to set coins.", threadID);
    }
  }
};
