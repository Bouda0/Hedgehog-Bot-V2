const fs = require("fs");

module.exports = {
  config: {
    name: "bank",
    version: "2.0",
    description: "Gérer votre argent et diamants à la banque avec dépôt, retrait, conversion, transfert et plus",
    guide: {
      fr: `==[🏦 Dexteur AI-Bank 🏦]==

Utilisez l'une des commandes suivantes :
⦿ ~bank déposer [montant]
⦿ ~bank retirer [montant]
⦿ ~bank solde
⦿ ~bank diamants
⦿ ~bank convertir-diamants [quantité]
⦿ ~bank convertir-argent [montant]
⦿ ~bank transfert-argent [montant] [uid]
⦿ ~bank transfert-diamants [quantité] [uid]
⦿ ~bank interet
⦿ ~bank pret [montant]
⦿ ~bank rembourser
⦿ ~bank gamble [montant]
⦿ ~bank top
==[🏦 Dexteur AI-Bank 🏦]==`
    },
    category: "💰 Économie",
    countDown: 5,
    role: 0,
    author: "Blẳȼk Il"
  },

  onStart: async function ({ args, message, event, api, usersData }) {
    const userId = event.senderID;
    const bankDataPath = 'scripts/cmds/bankData.json';

    // Initialisation du fichier de données
    if (!fs.existsSync(bankDataPath)) {
      fs.writeFileSync(bankDataPath, JSON.stringify({}), "utf8");
    }

    // Chargement des données bancaires
    const bankData = JSON.parse(fs.readFileSync(bankDataPath, "utf8"));
    
    // Migration des données existantes pour ajouter les diamants
    Object.keys(bankData).forEach(userId => {
      if (typeof bankData[userId].diamants === 'undefined') {
        bankData[userId].diamants = 0;
      }
    });

    // Création du compte si inexistant
    if (!bankData[userId]) {
      bankData[userId] = {
        banque: 0,
        diamants: 0,
        dernierInteret: Date.now(),
        dette: 0,
        datePret: 0
      };
    }

    // Récupération des données utilisateur
    const argentUser = await usersData.get(userId, "money") || 0;
    const soldeBanque = bankData[userId].banque || 0;
    const diamantsUser = bankData[userId].diamants || 0;
    const dette = bankData[userId].dette || 0;
    const datePret = bankData[userId].datePret || 0;
    const commande = args[0]?.toLowerCase();
    const montant = parseFloat(args[1]);
    const destinataireId = args[2];

    // Fonction de formatage des nombres
    function formatNumber(n) {
      const absN = Math.abs(n);
      if (absN >= 1e33) return (n / 1e33).toFixed(2) + "Dc";
      if (absN >= 1e30) return (n / 1e30).toFixed(2) + "No";
      if (absN >= 1e27) return (n / 1e27).toFixed(2) + "Oc";
      if (absN >= 1e24) return (n / 1e24).toFixed(2) + "Sp";
      if (absN >= 1e21) return (n / 1e21).toFixed(2) + "Sx";
      if (absN >= 1e18) return (n / 1e18).toFixed(2) + "Qi";
      if (absN >= 1e15) return (n / 1e15).toFixed(2) + "Qa";
      if (absN >= 1e12) return (n / 1e12).toFixed(2) + "T";
      if (absN >= 1e9) return (n / 1e9).toFixed(2) + "B";
      if (absN >= 1e6) return (n / 1e6).toFixed(2) + "M";
      if (absN >= 1e3) return (n / 1e3).toFixed(2) + "K";
      return n.toLocaleString('fr-FR');
    }

    // Fonction de conversion des montants avec suffixes
    function parseAmount(input) {
      if (!input) return NaN;
      if (!isNaN(input)) return parseFloat(input);
      
      const regex = /^(\d+\.?\d*)([a-zA-Z]+)$/;
      const match = input.match(regex);
      if (!match) return NaN;
      
      const num = parseFloat(match[1]);
      const suffix = match[2].toUpperCase();
      
      const suffixes = {
        'K': 1e3,
        'M': 1e6,
        'B': 1e9,
        'T': 1e12,
        'QA': 1e15,
        'QI': 1e18,
        'SX': 1e21,
        'SP': 1e24,
        'OC': 1e27,
        'NO': 1e30,
        'DC': 1e33
      };
      
      return suffixes[suffix] ? num * suffixes[suffix] : NaN;
    }

    // Gestion des commandes
    switch (commande) {
      case "déposer":
      case "deposer": {
        const montantDepot = parseAmount(args[1]) || montant;
        if (isNaN(montantDepot)) {
          return message.reply("❌ Veuillez entrer un montant valide à déposer.");
        }
        if (montantDepot <= 0) {
          return message.reply("❌ Le montant doit être supérieur à zéro.");
        }
        if (soldeBanque >= 1e104) {
          return message.reply("❌ Votre solde bancaire est au maximum, impossible de déposer plus.");
        }
        if (argentUser < montantDepot) {
          return message.reply(`❌ Vous n'avez pas assez d'argent sur vous pour déposer ${formatNumber(montantDepot)}💵.`);
        }
        bankData[userId].banque += montantDepot;
        await usersData.set(userId, { money: argentUser - montantDepot });
        fs.writeFileSync(bankDataPath, JSON.stringify(bankData), "utf8");
        return message.reply(`✅ Vous avez déposé ${formatNumber(montantDepot)}💵 dans votre compte bancaire.`);
      }

      case "retirer": {
        const montantRetrait = parseAmount(args[1]) || montant;
        if (isNaN(montantRetrait)) {
          return message.reply("❌ Veuillez entrer un montant valide à retirer.");
        }
        if (montantRetrait <= 0) {
          return message.reply("❌ Le montant doit être supérieur à zéro.");
        }
        if (argentUser >= 1e104) {
          return message.reply("❌ Vous ne pouvez pas retirer plus d'argent, vous avez déjà beaucoup sur vous.");
        }
        if (montantRetrait > soldeBanque) {
          return message.reply(`❌ Vous ne pouvez pas retirer ${formatNumber(montantRetrait)}💵. Votre solde est de ${formatNumber(soldeBanque)}💵.`);
        }
        bankData[userId].banque -= montantRetrait;
        await usersData.set(userId, { money: argentUser + montantRetrait });
        fs.writeFileSync(bankDataPath, JSON.stringify(bankData), "utf8");
        return message.reply(`✅ Vous avez retiré ${formatNumber(montantRetrait)}💵 de votre compte bancaire.`);
      }

      case "solde":
        return message.reply(`💰 Votre solde bancaire est de ${formatNumber(soldeBanque)}💵 et vous avez ${diamantsUser}💎 diamants.`);

      case "diamants":
      case "diamond":
        return message.reply(`💎 Vous avez ${diamantsUser} diamants dans votre compte bancaire.`);

      case "convertir-diamants":
      case "convert-diamonds": {
        const quantite = parseInt(args[1]);
        if (isNaN(quantite) || quantite <= 0) {
          return message.reply("❌ Veuillez entrer une quantité valide de diamants à convertir.");
        }
        if (quantite > diamantsUser) {
          return message.reply(`❌ Vous n'avez pas assez de diamants. Vous avez seulement ${diamantsUser}💎.`);
        }
        const montantConverti = quantite * 1e21; // 1 diamant = 1Sx
        bankData[userId].diamants -= quantite;
        bankData[userId].banque += montantConverti;
        fs.writeFileSync(bankDataPath, JSON.stringify(bankData), "utf8");
        return message.reply(`✅ Vous avez converti ${quantite}💎 diamants en ${formatNumber(montantConverti)}💵 (1💎 = 1Sx).`);
      }

      case "convertir-argent":
      case "convert-money": {
        const montantConvertir = parseAmount(args[1]) || montant;
        if (isNaN(montantConvertir)) {
          return message.reply("❌ Veuillez entrer un montant valide à convertir.");
        }
        if (montantConvertir <= 0) {
          return message.reply("❌ Le montant doit être supérieur à zéro.");
        }
        if (montantConvertir > soldeBanque) {
          return message.reply(`❌ Vous n'avez pas assez d'argent. Votre solde est de ${formatNumber(soldeBanque)}💵.`);
        }
        const diamantsConvertis = Math.floor(montantConvertir / 1e21); // 1Sx = 1 diamant
        if (diamantsConvertis < 1) {
          return message.reply("❌ Le montant minimum à convertir est 1Sx (1 diamant).");
        }
        bankData[userId].banque -= montantConvertir;
        bankData[userId].diamants += diamantsConvertis;
        fs.writeFileSync(bankDataPath, JSON.stringify(bankData), "utf8");
        return message.reply(`✅ Vous avez converti ${formatNumber(montantConvertir)}💵 en ${diamantsConvertis}💎 diamants (1Sx = 1💎).`);
      }

      case "transfert-argent":
      case "transfer-money": {
        const montantTransfert = parseAmount(args[1]) || montant;
        if (!destinataireId || isNaN(montantTransfert)) {
          return message.reply("❌ Usage: transfert-argent [montant] [uid]");
        }
        if (montantTransfert <= 0) {
          return message.reply("❌ Le montant doit être supérieur à zéro.");
        }
        const destinataire = destinataireId.replace(/[^0-9]/g, "");
        if (!bankData[destinataire]) {
          bankData[destinataire] = { banque: 0, diamants: 0, dernierInteret: Date.now(), dette: 0, datePret: 0 };
        }
        if (montantTransfert > soldeBanque) {
          return message.reply(`❌ Vous ne pouvez pas transférer ${formatNumber(montantTransfert)}💵. Votre solde est de ${formatNumber(soldeBanque)}💵.`);
        }
        bankData[userId].banque -= montantTransfert;
        bankData[destinataire].banque += montantTransfert;
        fs.writeFileSync(bankDataPath, JSON.stringify(bankData), "utf8");
        return message.reply(`💸 Vous avez transféré ${formatNumber(montantTransfert)}💵 à l'utilisateur ${destinataire}.`);
      }

      case "transfert-diamants":
      case "transfer-diamonds": {
        const quantiteTransfert = parseInt(args[1]);
        if (!destinataireId || isNaN(quantiteTransfert)) {
          return message.reply("❌ Usage: transfert-diamants [quantité] [uid]");
        }
        if (quantiteTransfert <= 0) {
          return message.reply("❌ La quantité doit être supérieure à zéro.");
        }
        const destinataire = destinataireId.replace(/[^0-9]/g, "");
        if (!bankData[destinataire]) {
          bankData[destinataire] = { banque: 0, diamants: 0, dernierInteret: Date.now(), dette: 0, datePret: 0 };
        }
        if (quantiteTransfert > diamantsUser) {
          return message.reply(`❌ Vous ne pouvez pas transférer ${quantiteTransfert}💎. Vous avez seulement ${diamantsUser}💎.`);
        }
        bankData[userId].diamants -= quantiteTransfert;
        bankData[destinataire].diamants += quantiteTransfert;
        fs.writeFileSync(bankDataPath, JSON.stringify(bankData), "utf8");
        return message.reply(`💎 Vous avez transféré ${quantiteTransfert} diamants à l'utilisateur ${destinataire}.`);
      }

      case "interet":
      case "intérêt": {
        const tauxInteret = 0.0015; // 0,15% par jour
        const dernierInteret = bankData[userId].dernierInteret || 0;
        const maintenant = Date.now();
        const deltaSecondes = (maintenant - dernierInteret) / 1000;
        if (deltaSecondes < 86400) {
          const restant = Math.ceil(86400 - deltaSecondes);
          const h = Math.floor(restant / 3600);
          const m = Math.floor((restant % 3600) / 60);
          return message.reply(`⏳ Vous pourrez réclamer vos intérêts dans ${h}h ${m}m.`);
        }
        if (soldeBanque <= 0) {
          return message.reply("❌ Vous n'avez pas d'argent à la banque pour générer des intérêts.");
        }
        const interetGagne = soldeBanque * tauxInteret * (deltaSecondes / 86400);
        bankData[userId].banque = Number((bankData[userId].banque + interetGagne).toFixed(2));
        bankData[userId].dernierInteret = maintenant;
        fs.writeFileSync(bankDataPath, JSON.stringify(bankData), "utf8");
        return message.reply(`💹 Vous avez gagné ${formatNumber(interetGagne)}💵 d'intérêts aujourd'hui.`);
      }

      case "pret":
      case "prêt": {
        if (dette > 0) {
          return message.reply("⚠ Vous avez déjà un prêt en cours. Remboursez-le avant d'en prendre un nouveau.");
        }
        const montantPret = parseAmount(args[1]) || montant;
        if (isNaN(montantPret)) {
          return message.reply("❌ Veuillez entrer un montant valide pour le prêt.");
        }
        if (montantPret < 1000 || montantPret > 25000) {
          return message.reply("❌ Le montant du prêt doit être entre 1.00K 💵 et 25.00K 💵.");
        }
        bankData[userId].banque += montantPret;
        bankData[userId].dette = Number((montantPret * 1.10).toFixed(2)); // 10% d'intérêt
        bankData[userId].datePret = Date.now();
        fs.writeFileSync(bankDataPath, JSON.stringify(bankData), "utf8");
        return message.reply(`💳 Prêt de ${formatNumber(montantPret)}💵 accordé avec 10% d'intérêt. Vous devrez rembourser ${formatNumber(bankData[userId].dette)}💵.`);
      }

      case "rembourser": {
        if (dette <= 0) {
          return message.reply("✅ Vous n'avez aucun prêt à rembourser.");
        }
        if (argentUser <= 0) {
          return message.reply("❌ Vous n'avez pas d'argent sur vous pour rembourser votre prêt.");
        }
        if (argentUser >= dette) {
          // Remboursement total
          bankData[userId].dette = 0;
          await usersData.set(userId, { money: argentUser - dette });
          fs.writeFileSync(bankDataPath, JSON.stringify(bankData), "utf8");
          return message.reply(`💸 Vous avez remboursé intégralement votre prêt de ${formatNumber(dette)}💵. Merci !`);
        } else {
          // Remboursement partiel
          bankData[userId].dette = Number((dette - argentUser).toFixed(2));
          await usersData.set(userId, { money: 0 });
          fs.writeFileSync(bankDataPath, JSON.stringify(bankData), "utf8");
          return message.reply(`💸 Vous avez remboursé partiellement ${formatNumber(argentUser)}💵. Il vous reste ${formatNumber(bankData[userId].dette)}💵 à rembourser.`);
        }
      }

      case "gamble": {
        const montantGamble = parseAmount(args[1]) || montant;
        if (isNaN(montantGamble)) {
          return message.reply("❌ Veuillez entrer un montant valide à parier.");
        }
        if (montantGamble <= 0) {
          return message.reply("❌ Le montant doit être supérieur à zéro.");
        }
        if (argentUser < montantGamble) {
          return message.reply(`❌ Vous n'avez pas assez d'argent sur vous pour parier ${formatNumber(montantGamble)}💵.`);
        }
        const chanceGagner = 0.55; // 55% de chance de gagner
        const gain = montantGamble * 2;
        const rand = Math.random();
        if (rand < chanceGagner) {
          // Gagné
          await usersData.set(userId, { money: argentUser + montantGamble });
          return message.reply(`🎉 Félicitations ! Vous avez gagné ${formatNumber(gain)}💵 au gamble.`);
        } else {
          // Perdu
          await usersData.set(userId, { money: argentUser - montantGamble });
          return message.reply(`😞 Vous avez perdu ${formatNumber(montantGamble)}💵 au gamble. Essayez encore !`);
        }
      }

      case "top": {
        const topUsers = Object.entries(bankData)
          .sort((a, b) => (b[1].banque + b[1].diamants * 1e21) - (a[1].banque + a[1].diamants * 1e21))
          .slice(0, 20);
        
        let reply = `===[🏦 Black AI-Bank 🏦]===\n\n🏆 Top 20 des plus riches de la Bank :\n\n`;
        
        const emojis = ["🤴︱", "🧑‍✈︱", "🤵‍♀︱", "🤵︱", "🤵‍♂︱", "👨‍💼︱", "👨‍💼︱", "👨‍💼︱", "👨‍💼︱", "👨‍💼︱", "🧖︱", "🧖‍♂︱", "🧖‍♀︱", "🧖︱", "🧖︱", "🙍‍♂︱", "🙍‍♂︱", "🙎︱", "🙎︱", "🙎︱"];

        for (let i = 0; i < topUsers.length; i++) {
          const id = topUsers[i][0];
          const userBanque = Math.floor(topUsers[i][1].banque);
          const userDiamants = topUsers[i][1].diamants || 0;
          try {
            const userInfo = await api.getUserInfo(id);
            const nomUser = userInfo[id]?.name || "Inconnu";
            const emoji = emojis[i] || "👤︱";
            
            reply += `════════ ◈ ════════\n`;
            reply += `${i + 1}. ${emoji}${nomUser} - ${formatNumber(userBanque)}\n`;
            reply += `💰| Coin ${userBanque.toLocaleString('fr-FR')}💵\n`;
            reply += `💎| ${userDiamants.toLocaleString('fr-FR')} diamants\n`;
          } catch {
            reply += `════════ ◈ ════════\n`;
            reply += `${i + 1}. 👤︱Inconnu - ${formatNumber(userBanque)}\n`;
            reply += `💰| Coin ${userBanque.toLocaleString('fr-FR')}💵\n`;
            reply += `💎| ${userDiamants.toLocaleString('fr-FR')} diamants\n`;
          }
        }
        
        reply += `════════ ◈ ════════\n`;
        reply += `\n===[🏦 Black AI-Bank 🏦]===`;
        return message.reply(reply);
      }

      default:
        return message.reply(
`===[🏦 Black AI-Bank 🏦]===

Utilisez l'une des commandes suivantes :
⦿ ~bank déposer [montant]
⦿ ~bank retirer [montant]
⦿ ~bank solde
⦿ ~bank diamants
⦿ ~bank convertir-diamants [quantité]
⦿ ~bank convertir-argent [montant]
⦿ ~bank transfert-argent [montant] [uid]
⦿ ~bank transfert-diamants [quantité] [uid]
⦿ ~bank interet
⦿ ~bank pret [montant]
⦿ ~bank rembourser
⦿ ~bank gamble [montant]
⦿ ~bank top
===[🏦 Black AI-Bank 🏦]===`
        );
    }
  }
};
