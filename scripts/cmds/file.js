const fs = require('fs');

module.exports = {
	config: {
		name: "file",
		aliases: ["files"],
		version: "1.0",
		author: "Mahir Tahsan",
		countDown: 5,
		role: 0,
		shortDescription: "Send bot script",
		longDescription: "Send bot specified file ",
		category: "𝗢𝗪𝗡𝗘𝗥",
		guide: "{pn} file name. Ex: .{pn} filename"
	},

	onStart: async function ({ message, args, api, event }) {
		const permission = ["61583260362822"];
		if (!permission.includes(event.senderID)) {
			return api.sendMessage("🤦🏿|𝑺𝒂𝒍𝒆 𝒅𝒆́𝒍𝒊𝒏𝒒𝒖𝒂𝒏𝒕 enfoiré de med 𝒍𝒂̀ 𝒄𝒆𝒕𝒕𝒆 𝒄𝒎𝒅 𝒏'𝒆𝒔𝒕 𝒑𝒂𝒔 𝒅𝒆 𝒕𝒐𝒏 𝒂̂𝒈𝒆 🔞 𝒔𝒆𝒖𝒍 𝒍𝒆 𝒕𝒐𝒖𝒕 𝒑𝒖𝒊𝒔𝒔𝒂𝒏𝒕 ᎬᏝᏉᎥᎦ  𝒑𝒆𝒖𝒕 𝒍'𝒖𝒔𝒆𝒓", event.threadID, event.messageID);
		}

		const fileName = args[0];
		if (!fileName) {
			return api.sendMessage("Please provide a file name.", event.threadID, event.messageID);
		}

		const filePath = __dirname + `/${fileName}.js`;
		if (!fs.existsSync(filePath)) {
			return api.sendMessage(`File not found: ${fileName}.js`, event.threadID, event.messageID);
		}

		const fileContent = fs.readFileSync(filePath, 'utf8');
		api.sendMessage({ body: fileContent }, event.threadID);
	}
};
