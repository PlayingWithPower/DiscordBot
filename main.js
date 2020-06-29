//The main hub for the bot, more comments coming soon.
//Most of the commands are labeled apprioriately so far. More organization coming soon.
const Discord = require('discord.js')
const client = new Discord.Client()

const deckObj = require('./objects/Deck')
const gameObj = require('./objects/Game')
const leagueObj = require('./objects/League')
const seaonObj = require('./objects/Season')
const userObj = require('./objects/User')

const botListeningPrefix = "!";

const Module = require('./mongoFunctions')
const generalID = require('./constants')
const moongoose = require('mongoose')
const { Cipher } = require('crypto')
const { type } = require('os')
const url = 'mongodb+srv://firstuser:e76BLigCnHWPOckS@cluster0-ebhft.mongodb.net/UserData?authSource=admin&replicaSet=Cluster0-shard-0&readPreference=primary&appname=MongoDB%20Compass&ssl=true'

moongoose.connect(url, { useNewUrlParser: true, useUnifiedTopology: true });

client.on('ready', (on) =>{
    console.log("Debug log: Successfully connected as " + client.user.tag)
    client.user.setPresence({
        game: { 
            name: 'my code',
            type: 'WATCHING'
        },
        status: 'online'
    })
  
    
    //Lists out the "guilds" in a discord server, these are the unique identifiers so the bot can send messages to server channels
    // client.guilds.cache.forEach((guild) => {
    //     console.log(guild.id)
    //     guild.channels.cache.forEach((channel) =>{
    //         console.log(` - ${channel.name} ${channel.type} ${channel.id}`)
    //     })
    // })
    // client.user.setUsername("PWP Bot"); 
})
client.on('message', (receivedMessage) =>{
    if (receivedMessage.author == client.user){
        return 
    }
    if (receivedMessage.mentions.users == client.user){
        let generalChannel = client.channels.cache.get(generalID.getGeneralChatID())
        generalChannel.channel.send("text")
    }
    if (receivedMessage.content.startsWith(botListeningPrefix)){
        processCommand(receivedMessage)
    }
    else{
        let currentChannel =  client.channels.cache.get()
    }
    deckObj.populateDecks(receivedMessage)
})
/**
 * TODO: 
 */
client.on('messageReactionAdd', (reaction, user) => {
    manageReaction(reaction, user)
})
/**
 * 
 * @param {*} reaction - discord reaction obj
 * @param {*} user  - discord user obj
 * 
 * This is the async manager function for whenever a reaction is submitted. 
 * Atm it only cares about upvotes and downvotes on Game messages
 * 
 * TODO: Confirm with current deck user is using
 */
async function manageReaction(reaction, user) {
    const msg = reaction.message.content.toString().split(' ');
    let sanitizedString = "<@!"+user.id+">"
    
    // Catch impersonators block -- Remove if you want bot to react to reactions on non-bot messages
    if (reaction.message.author.id != "717073766030508072") {
        return
    }

    // Game Block
    if (msg.length > 3 && msg[1] == "Game" && msg[2] == "ID:" && reaction.emoji.name === '👍' && user.id != "717073766030508072") {
        if (sanitizedString !=  msg[5]){
            return
        }
        //const result = await gameObj.confirmMatch(msg[3], sanitizedString).catch((message) => {
        //})
        gameObj.confirmMatch(msg[3], sanitizedString).then(function() {
                gameObj.checkMatch(msg[3]).then(function(next) {
                    if (next == "SUCCESS") {
                        gameObj.logMatch(msg[3]).then(function(final) {
                            gameObj.finishMatch(msg[3]).then(function(){
                                let generalChannel = getChannelID(reaction.message)

                                generalChannel.send(">>> Match logged!")
                                final.forEach(message => {
                                    generalChannel.send(">>> " + message)
                                })
                                console.log("Game #" + msg[3] + " success")
                                return
                            }).catch((message) => {
                                console.log("Finishing Game #" + msg[3] + " failed. ERROR:", message)
                                })

                        }).catch((message) => {
                            console.log("ERROR: " + message)
                            return
                            })
                    }
                }).catch((message) => {
                    console.log("ERROR: " + message)
                    return
                    })
        }).catch((message) => {
            console.log("ERROR: " + message)
            return
            })
    }
    else if ((msg.length > 3 && msg[1] == "Game" && msg[2] == "ID:" && reaction.emoji.name === '👎' && user.id != "717073766030508072")){
        if (sanitizedString !=  msg[5]){
            console.log("not the right user")
            return
        }
        const result = await gameObj.closeMatch(msg[3]).catch((message) => {
            console.log("Closing Game #" + msg[3] + " failed.")
        })
        if (result == 'SUCCESS'){
            let generalChannel = getChannelID(reaction.message)
            generalChannel.send(">>> " + msg[5] + " cancelled the Match Log")
        }
        else {
            return
        }
    }
    //end of game block
    //Confirm Delete Match Block
    else if ((msg.length > 4 && msg[2] == "DELETE" && msg[3] == "MATCH:" && reaction.emoji.name === '👍' && user.id != "717073766030508072")) {
        if (sanitizedString != msg[7]) {
            return
        }
        var generalChannel = getChannelID(reaction.message)
        gameObj.confirmedDeleteMatch(msg[5], reaction.message).then((message) => {  
            generalChannel.send("Successfully deleted Match #" + msg[5])
            reaction.message.edit(">>> " + msg[7] +" **DELETED MATCH:** " + msg[5])
        }).catch((message) => {
            generalChannel.send("Match already deleted")
        })
    }
    else if ((msg.length > 4 && msg[2] == "DELETE" && msg[3] == "MATCH:" && reaction.emoji.name === '👎' && user.id != "717073766030508072")) {
        if (sanitizedString != msg[7]) {
            return
        }
        reaction.message.edit(">>> " + msg[7] + "**CANCELLED DELETING MATCH #" + msg[5] + "**");
    }
    //End of Confirm Delete Match Block
    else {
        return
    }
    
}
function processCommand(receivedMessage){
    let fullCommand = receivedMessage.content.substr(1)
    let splitCommand = fullCommand.split(" ")
    let primaryCommand = splitCommand[0]
    let arguments = splitCommand.slice(1)

    let channel = receivedMessage.channel.id
    let channelResponseFormatted = client.channels.cache.get(channel)

    let server = receivedMessage.guild.id
    //console.log(server)
    let responseFormatted = client.channels.cache.get(channel)


    switch(primaryCommand){
        case "help":
            helpCommand(receivedMessage, arguments)
            break;
        case "register":
            register(receivedMessage, arguments, channelResponseFormatted)
            break;
        case "users":
            users(receivedMessage, arguments)
            break;
        case "log":
            startMatch(receivedMessage, arguments)
            break;
        case "delete":
            deleteMatch(receivedMessage, arguments)
            break;
        case "info":
            matchInfo(receivedMessage, arguments)
            break;
        case "profile":
            profile(receivedMessage, arguments)
            break;
        case "recent":
            recent(receivedMessage, arguments)
            break;
        case "use":
            use(receivedMessage, arguments)
            break;
        case "current":
            current(receivedMessage, arguments)
            break;
        case "add":
            addToCollection(receivedMessage, arguments)
            break;
        case "decks":
            listDecks(responseFormatted)
            break;
        case "decksdetailed":
            listDecksDetailed(responseFormatted);
            break;
        case "deckstats":
            deckStats(receivedMessage, arguments);
            break;
        case "mydecks":
            listUserDecks(receivedMessage, arguments);
            break;
        case "adddeck":
            addDeck(receivedMessage, arguments);
            break;
        case "credits":
            credits(receivedMessage, arguments)
            break;
        default:
            receivedMessage.channel.send(">>> Unknown command. Try '!help'")
    }
}
async function deckStats(receivedMessage,args){
    let generalChannel = getChannelID(receivedMessage)
    let returnArr = await deckObj.deckStats(receivedMessage, args)
    const useEmbed = new Discord.MessageEmbed()
        .setColor("#0099ff") //blue
        .setTitle("*"+returnArr[0]+"*" + " Deckstats")
        .addFields(
            { name: 'Wins', value: returnArr[1], inline: true},
            { name: 'Losses', value: returnArr[2], inline: true},
            { name: 'Number of Matches', value: returnArr[1] + returnArr[2], inline: true}, 
            { name: 'Winrate', value: Math.round((returnArr[1]/(returnArr[1]+returnArr[2]))*100) + "%", inline: true}, 
        )
        generalChannel.send(useEmbed)
}
function toUpper(str) {
    return str
        .toLowerCase()
        .split(' ')
        .map(function(word) {
            // console.log("First capital letter: "+word[0]);
            // console.log("remain letters: "+ word.substr(1));
            return word[0].toUpperCase() + word.substr(1);
        })
        .join(' ');
}

function listCollection(receivedMessage, args){
    var callbackName = new Array();
    var callbackWins = new Array();
    var callbackLosses = new Array();
    const profileEmbed = new Discord.MessageEmbed()
        .setColor('#0099ff')
            .setURL('')

    let generalChannel = client.channels.cache.get(generalID.getGeneralChatID())
    userObj.profile(receivedMessage, args, function(callback, err){
            callback._deck.forEach(callbackItem =>{
                callbackName.push(toUpper(callbackItem.Deck))
                callbackWins.push(callbackItem.Wins)
                callbackLosses.push(callbackItem.Losses)
            })
            if (callbackName.length > 1){
                for (i = 1; i < callbackName.length; i++){
                    var calculatedWinrate = (callbackWins[i]/((callbackLosses[i])+(callbackWins[i])))*100
                    if (isNaN(calculatedWinrate)){
                        calculatedWinrate = 0;
                    }

                    profileEmbed.addFields(
                        { name: 'Deck Name', value: callbackName[i]},
                        { name: 'Wins', value: callbackWins[i], inline: true },
                        { name: 'Losses', value: callbackLosses[i], inline: true },
                        { name: 'Winrate', value: calculatedWinrate + "%", inline: true },
                    )
                }
                generalChannel.send(profileEmbed)
            }
            else{
                generalChannel.send(">>> No decks in "+"<@!"+receivedMessage.author.id+">"+"'s collection. Please add decks using !addtoprofile <deckname>")
            }
        })
        
            
}
function addToCollection(receivedMessage, args){
    let generalChannel = client.channels.cache.get(generalID.getGeneralChatID())
    userObj.addToCollection(receivedMessage, args, function(callback, err){
        generalChannel.send(">>> " + callback)
    })
}
function use(receivedMessage, args){
    let generalChannel = getChannelID(receivedMessage)
    const useEmbed = new Discord.MessageEmbed()
    .setColor('#5fff00')
        .setURL('')
    userObj.useDeck(receivedMessage, args, function(callback, err){
            if (callback == "1"){
                useEmbed
                .setColor("#af0000") //red
                .setDescription(receivedMessage.author.username + " is not registered. Register with !register")
                generalChannel.send(useEmbed)
            }
            else if (callback[0] == "2"){
                useEmbed
                .setColor("#af0000")
                .setDescription("**"+callback[1]+"**" + " is not a registered alias. \n Try !decks and choose an alias or !use <deckname> | Rogue ")
                generalChannel.send(useEmbed)
            }
            else if (callback == "3"){
                useEmbed
                .setColor("#af0000")
                .setDescription("Error setting deck. Please try again.")
                generalChannel.send(useEmbed)
            }
            else if (callback[0] == "4"){
                useEmbed
                .setColor("#5fff00") //green
                .setDescription("Successfully set " + "**"+callback[1]+"**"+ " as the Current Deck for " + "<@!" + receivedMessage.author.id + ">")
                generalChannel.send(useEmbed)
            }
            else if (callback == "5"){
                useEmbed
                .setColor("#af0000") 
                .setDescription("Please provide a deck name to differentiate between your 'Rogue' decks. Try !use <deckname> | Rogue")
                generalChannel.send(useEmbed)
            }
            else if (callback[0] == "5"){
                useEmbed
                .setColor("#af0000") 
                .setDescription("You are attempting to use a registered alias: " + "**" + callback[1] + "**" + ". Please try !use <deckname> | Rogue if your list deviates greatly from the primer. Otherwise, try !use " + "**" + callback[1]+"**")
                generalChannel.send(useEmbed)
            }
    });
}
function current(receivedMessage, args){
    let generalChannel = client.channels.cache.get(generalID.getGeneralChatID())
    var callBackArray = new Array();
    const profileEmbed = new Discord.MessageEmbed()
    .setColor('#0099ff')
        .setURL('')

    userObj.currentDeck(receivedMessage, args, function(callback, err){
        if (callback == "Error: 1"){
            generalChannel.send(">>> User not found.")
        }
        else if (callback == "Error: 2"){
            generalChannel.send(">>> No deck found for that user")
        }
        else{
            callback.forEach(item =>{
                callBackArray.push(item)
            })
            profileEmbed.addFields(
                { name: 'Deck Name', value: callBackArray[1]},
                { name: 'URL', value: callBackArray[0], inline: true },

            )
            generalChannel.send(profileEmbed)
        }
    })
}
function getUserAvatarUrl(user) {
    return "https://cdn.discordapp.com/avatars/" + user.id + "/" + user.avatar + ".png"
}
function getUserFromMention(mention) {
	if (!mention) return;

	if (mention.startsWith('<@') && mention.endsWith('>')) {
		mention = mention.slice(2, -1);

		if (mention.startsWith('!')) {
			mention = mention.slice(1);
		}
		return client.users.fetch(mention)
	}
}
/**
 * 
 * @param {Discord Message Obj} receivedMessage 
 * @param {*} args
 * 
 * TODO: Fix Bot avatar image
 * TODO: Fix "Showing X recent matches" line, sounds awkward
 *  
 */
async function recent(receivedMessage, args) {
    let generalChannel = getChannelID(receivedMessage)
    if (args.length == 0) {
        var matches_arr = await userObj.recent(receivedMessage)
    }
    else if (args.length == 1) {
        if (args[0].charAt(0) != "<" || args[0].charAt(1) != "@" || args[0].charAt(2) != "!") {
            generalChannel.send("Use **@[user]** when searching other users recent matches")
            return
        }
        var matches_arr = await userObj.recent(receivedMessage, args[0])
    }
    else {
        generalChannel.send("**Error**: Bad Input")
        return
    }
    let tempEmbed

    //Log only 3 most recent matches
    matches_arr = matches_arr.slice(0,3)
    if (matches_arr.length == 0) {
        generalChannel.send("**Error:** User has no matches in the system")
        return
    }
    generalChannel.send(">>> Showing " + matches_arr.length.toString() + " recent match(es)")
    matches_arr.forEach(async(match) => {
        var convertedToCentralTime = match[0].toLocaleString("en-US", {timeZone: "America/Chicago"})

        const bot = await getUserFromMention('<@!717073766030508072>')
        const winner = await getUserFromMention(match[4])
        const loser1 = await getUserFromMention(match[5])
        const loser2 = await getUserFromMention(match[6])
        const loser3 = await getUserFromMention(match[7])
        tempEmbed = new Discord.MessageEmbed()
            .setColor('#0099ff') //blue
            .setTitle('Game ID: ' + match[1])
            .setThumbnail(getUserAvatarUrl(winner))
            .addFields(
                { name: 'Season: ', value: match[3], inline: true},
                { name: 'Time (Converted to CST/CDT)', value:convertedToCentralTime, inline: true},
                { name: 'Winner:', value: '**'+winner.username+'**' + ' piloting ' + '**'+match[8]+'**'},
                { name: 'Opponents:', value: 
                '**'+loser1.username+'**'+ ' piloting ' + '**'+match[9]+'**' + '\n'
                + '**'+loser2.username+'**'+ ' piloting ' + '**'+match[10]+'**' + '\n' 
                + '**'+loser3.username+'**'+ ' piloting ' + '**'+match[11]+'**' }
            )
        generalChannel.send(tempEmbed)
    })
}
async function listUserDecks(receivedMessage, args){
    let channel = getChannelID(receivedMessage)
    let returnArr = await deckObj.listUserDecks(receivedMessage)
    let pushingArr =  new Array();
    console.log(returnArr)
    console.log(typeof(returnArr))
    returnArr.forEach(async(deck)=>{
        console.log(deck._deck)
    })
}
function listDecks(channel){
    deckObj.listDecks(function(callback,err){
        const listedDecksEmbed = new Discord.MessageEmbed()
            .setColor('#0099ff')
            .setURL('')
       for(i = 0; i < callback.length; i++){
            listedDecksEmbed.addFields(
                { name: " \u200b",value: callback[i]._name},
            )
        }
        channel.send(listedDecksEmbed)
    });
}
function listDecksDetailed(channel){
    deckObj.listDecks(function(callback,err){
        const listedDecksEmbed = new Discord.MessageEmbed()
            .setColor('#0099ff')
            .setURL('')
       for(i = 0; i < callback.length; i++){
            listedDecksEmbed.addFields(
                { name: " \u200b",value: callback[i]._name},
                { name: 'Created By', value: callback[i]._user, inline: true},
                { name: 'Wins', value: "Update me", inline: true},
                { name: 'Losses', value: "Update me", inline: true},
            )
        }
        channel.send(listedDecksEmbed)
    });
}
function addDeck(receivedMessage, args){
    var callBackArray = new Array();
    let generalChannel = client.channels.cache.get(generalID.getGeneralChatID())
    
    deckObj.addDeck(receivedMessage, args, function(callback,err){
        if ((callback != ("Error: Deck name already used"))&& 
        (callback != ("Error: Unable to save to Database, please try again"))&&
        (callback != ("Error: Not a valid URL, please follow the format !adddeck <url> <name>"))
        ){
            callback.forEach(item => {
                callBackArray.push(item)
            });

            var grabURL = callBackArray[0].toString()
            var grabName = callBackArray[1].toString()
            
            const exampleEmbed = new Discord.MessageEmbed()
            .setColor('#0099ff')
            .setURL('')
            .addFields(
                { name: 'Decklist', value: "[Link]("+grabURL+")"},
                { name: 'Name', value: grabName},
            )
            generalChannel.send("Successfully uploaded new Decklist to Decklists!")
            generalChannel.send(exampleEmbed)
        }
        else{
            generalChannel.send(callback)
        }
    });
}
function profile(receivedMessage, args){
    let generalChannel = client.channels.cache.get(generalID.getGeneralChatID())
    userObj.profile(receivedMessage, args, function(callback, err){
        var embedOutput;
        var highest = Number.NEGATIVE_INFINITY;
        var output;
        var tmp;
        for (var i= callback._deck.length-1; i>=1; i--) {
            tmp = (callback._deck[i].Wins) + (callback._deck[i].Losses);
            if (tmp > highest){
                highest = tmp;
                output = callback._deck[i]
            }
        }
        if (output === undefined || highest == 0){
            embedOutput = "No Data Yet."
        }
        else{
            embedOutput = output.Deck
        }

        var calculatedWinrate = (callback._wins/((callback._losses)+(callback._wins)))*100
        if (isNaN(calculatedWinrate)){
            calculatedWinrate = 0;
        }

        const profileEmbed = new Discord.MessageEmbed()
        .setColor('#0099ff')
            .setURL('')
            .addFields(
                { name: 'User', value: callback._mentionValue, inline: true },
                { name: 'Season', value: callback._season, inline: true },
                { name: 'Current Deck', value: callback._currentDeck, inline: true },
                { name: 'Current Rating', value: callback._elo, inline: true },
                { name: 'Wins', value:  callback._wins, inline: true },
                { name: 'Losses', value:  callback._losses, inline: true },
                { name: 'Winrate', value: calculatedWinrate + "%", inline: true },
                { name: 'Favorite Deck', value: embedOutput, inline: true },
            )
        generalChannel.send(profileEmbed)
    });
    
}
async function logLosers(receivedMessage, args){
    var callBackArray = new Array();
    //var lostEloArray = new Array();
    let generalChannel = client.channels.cache.get(generalID.getGeneralChatID())

    Module.logLosers(args, function(callback,err){
        callback.forEach(item => {
            callBackArray.push(item)
        });
        generalChannel.send(">>> " + callback[0] + " upvote to confirm this game. Downvote to contest. Make sure to $use <deckname> before reacting.")
        .then(function (message, callback){
            const filter = (reaction, user) => {
                return ['👍', '👎'].includes(reaction.emoji.name) && user.id !== message.author.id;
            };   

            message.react("👍")
            message.react("👎")
            // @TODO: 
            // Look into time of awaitReactions (configurable?)
            // Log points only after upvotes are seen. Right now we are logging THEN checking upvotes
            message.awaitReactions(filter, { max: 1, time: 60000, errors: ['time'] })
                .then(collected => {
                    const reaction = collected.first();

                    if (reaction.emoji.name === '👍') {
                        receivedMessage.reply("received confirmation for logging");
                        //console.log(reaction.users)
                    }
                    else {
                        receivedMessage.reply('received contest on game. Please resolve issue then log game again.');
                        return
                    }
                })
        })
        callback.shift()
        // Module.logWinners(receivedMessage, callback, function(callback, err){
        //     //console.log(callback)
        // })
        
    })
   
}
/**
 * TODO: 
 */
function startMatch(receivedMessage, args){
    const user = require('./Schema/Users')
    let generalChannel = client.channels.cache.get(receivedMessage.channel.id)

    let sanitizedString = "<@!"+receivedMessage.author.id+">"
    const UserIDs = new Array()

    //Generates random 4 char string for id
    let s4 = () => {
        return Math.floor((1 + Math.random()) * 0x1000).toString(16).substring(1);
    }
    let id = s4() + s4() + s4() + s4()

    // Check to make sure the right amount of users tagged
    if (args.length < 3 || args.length > 3) {
        generalChannel.send(">>> **Error**: Submit only the 3 players who lost in the pod")
        return
    }
    // Make sure every user in message (and message sender) are different users [Block out if testing]
    // var tempArr = args
    // tempArr.push(sanitizedString)
    // if (gameObj.hasDuplicates(tempArr)){
    //     generalChannel.send(">>> **Error**: You can't log a match with duplicate players")
    //     return
    // }

    // Check if User who sent the message is registered
    let findQuery = {_mentionValue: sanitizedString}
    user.findOne(findQuery, function(err, res){
        if (res){
            // Check if user who sent the message has a deck used
            if (res._currentDeck == "None") {
                generalChannel.send(">>> **Error**: " + res._mentionValue + " doesn't have a deck in use, type !use <deckname>")
                return
            }
            UserIDs.push(sanitizedString)

            // Check if Users tagged are registered
            let ConfirmedUsers = 0
            args.forEach(loser =>{
                let findQuery = {_mentionValue: loser.toString()}
                user.findOne(findQuery, function(err, res){
                    if (res){
                        // Check if users tagged have a deck used
                        if (res._currentDeck == "None") {
                            generalChannel.send(">>> **Error**: " + res._mentionValue + " doesn't have a deck in use, type !use <deckname>")
                            return
                        }
                        UserIDs.push(loser)
                        ConfirmedUsers++
                        if (ConfirmedUsers == 3){
                            // Double check UserID Array then create match and send messages
                            if (UserIDs.length != 4){
                                generalChannel.send(">>> **Error:** Code 300")
                                return
                            }
                            else{
                                gameObj.createMatch(UserIDs[0], UserIDs[1], UserIDs[2], UserIDs[3], id, receivedMessage, function(cb, err){
                                    if (cb == "FAILURE"){
                                        generalChannel.send(">>> **Error:** Code 301")
                                        return
                                    }
                                    else {
                                        UserIDs.forEach(player => {
                                            findQuery = {_mentionValue: player}
                                            user.findOne(findQuery, function(err, res){
                                                generalChannel.send(">>> Game ID: " + id + " - " + res._mentionValue + " used **" + res._currentDeck + "**, upvote to confirm this game or downvote to contest. ")
                                                    .then(function (message, callback){
                                                    const filter = (reaction, user) => {
                                                        return ['👍', '👎'].includes(reaction.emoji.name) && user.id !== message.author.id;
                                                    };   

                                                    message.react("👍")
                                                    message.react("👎")
                                                })
                                            })
                                        })
                                    }
                                })
                            }
                        }
                    }
                    else{
                        generalChannel.send(">>> **Error**: " + loser + " isn't registered, type !register")
                        return
                    }
                })
            })
        }
        else{
            generalChannel.send(">>> **Error**: " + sanitizedString + " isn't registered, type !register")
            return
        }
    })
}
/**
 * 
 * @param {discord message obj} receivedMessage 
 * @param {array} args Message content beyond command
 * TODO: Add admin functionality only
 */
async function deleteMatch(receivedMessage, args) {
    var generalChannel = getChannelID(receivedMessage)
    let sanitizedString = "<@!"+receivedMessage.author.id+">"

    //Catch bad input
    if (args.length != 1) {
        generalChannel.send("**Error**: Bad input")
        return
    }

    const response = await gameObj.deleteMatch(args[0], receivedMessage).catch((message) => {
        generalChannel.send("**Error**: Match not found")
        return
    })
    if (response == "SUCCESS") {
        generalChannel.send("Successfully deleted Match #" + args[0])
    }
    else if (response == "CONFIRM") {
        generalChannel.send(">>> ** DELETE MATCH: ** " + args[0] + " - " + sanitizedString + " This is a finished match, Upvote to confirm, downvote to cancel")
        .then(function (message, callback){
            const filter = (reaction, user) => {
                return ['👍', '👎'].includes(reaction.emoji.name) && user.id !== message.author.id;
            };   

            message.react("👍")
            message.react("👎")
        })
    }
    else {
        return
    }
}

/**
 * 
 * @param {discord message obj} receivedMessage 
 * @param {array} args 
 * 
 * TODO: Print to general channel, currently only logs info about match
 */
async function matchInfo(receivedMessage, args) {
    var generalChannel = getChannelID(receivedMessage)
    let sanitizedString = "<@!"+receivedMessage.author.id+">"

    //Catch bad input
    if (args.length != 1) {
        generalChannel.send("**Error**: Bad input")
        return
    }

    const response = await gameObj.matchInfo(args[0], receivedMessage).catch((message) => {
        generalChannel.send("**Error**: Match not found")
        return
    }).then((message) => {
        console.log(message)
    })
}
function logMatch(receivedMessage, args){
    const user = require('./Schema/Users')
    let generalChannel = client.channels.cache.get(generalID.getGeneralChatID())
    let arg
    callbackArr = new Array()
    cbArr = new Array()


    if (args.length < 3 || args.length > 3) {
        generalChannel.send(">>> **Error**: Submit only the 3 players who lost in the pod")
        return
    }

    args.forEach(loser =>{
        let findQuery = {_id: loser.toString()}
        console.log(findQuery)
        user.findOne(findQuery, function(err, res){
            if (res){
                generalChannel.send(">>> " + res._id + " upvote to confirm this game. Downvote to contest. Make sure to $use <deckname> before reacting.")
                    .then(function (message, callback){
                    const filter = (reaction, user) => {
                        return ['👍', '👎'].includes(reaction.emoji.name) && user.id !== message.author.id;
                    };   

                    message.react("👍")
                    message.react("👎")

                    message.awaitReactions(filter, { max: 1, time: 60000, errors: ['time'] })
                        .then(collected => {
                        const reaction = collected.first();

                        if (reaction.emoji.name === '👍') {
                            console.log(reaction.author)
                            generalChannel.send(loser + " received confirmation for logging");
                            arg = res._id.toString()
                            gameObj.logLoser(arg, function(cb, err){
                                cbArr.push(cb)
                                if (cb == "Error: FAIL"){
                                    callbackArr.push("Error: FAIL " + " " + loser)
                                }
                                else if (cb == "Error: NO-REGISTER"){
                                    callbackArr.push("Error: NO-REGISTER " + " " + loser)
                                }
                                else {
                                    callbackArr.push("LOSS: " + loser + ":" + " Current Points: " + cb)
                                    if (callbackArr.length == 4){
                                        callbackArr.forEach(cb => {
                                                generalChannel.send(">>> " + cb)
                                            });
                                        }
                                }
                            })
                        }
                        else {
                            receivedMessage.reply('received contest on game. Please resolve issue then log game again.');
                            return
                        }
                    }).catch(collected => {
                        return
                    })
                })
            }
            else {
                callbackArr.push("USER NOT FOUND ", + " " + loser)
            }
        })
    });
    arg = receivedMessage.author.id.toString()
    gameObj.logWinner(arg, function(cb, err){
        cbArr.push(cb)
        if (cb == "Error: FAIL"){
            callbackArr.push("Error: FAIL " + " " + receivedMessage.author.id)
        }
        else if (cb == "Error: NO-REGISTER"){
            callbackArr.push("Error: NO-REGISTER " + " " + receivedMessage.author.id)
        }
        else {
            let sanitizedString = "<@!"+receivedMessage.author.id+">"
            generalChannel.send(">>> " + sanitizedString + " upvote to confirm this game. Downvote to contest. Make sure to $use <deckname> before reacting.")
            .then(function (message, callback){
                const filter = (reaction, user) => {
                    return ['👍', '👎'].includes(reaction.emoji.name) && user.id !== message.author.id;
                };   

                message.react("👍")
                message.react("👎")
                // @TODO: 
                // Look into time of awaitReactions (configurable?)
                // Log points only after upvotes are seen. Right now we are logging THEN checking upvotes
                message.awaitReactions(filter, { max: 1, time: 60000, errors: ['time'] })
                    .then(collected => {
                        const reaction = collected.first();

                        if (reaction.emoji.name === '👍') {
                            generalChannel.send(sanitizedString + " received confirmation for logging");
                            callbackArr.push("WIN: " + sanitizedString + ":" + " Current Points: " + cb)
                            if (callbackArr.length == 4){
                                callbackArr.forEach(cb => {
                                        generalChannel.send(">>> " + cb)
                                    });
                            }
                        }
                        else {
                            receivedMessage.reply('received contest on game. Please resolve issue then log game again.');
                            return
                        }
                    })
            })
        }
    })
}
function users(receivedMessage, args){
    /* @TODO
    This function can be useful for other aspects of the project, it should be converted to a general count function. ATM it only 
    counts the number of documents in the user collection, but it can be expanded to a lot more.
    */
    let generalChannel = client.channels.cache.get(generalID.getGeneralChatID())
    Module.listAll(receivedMessage, function(callback, err){
        generalChannel.send(">>> There are " + callback + " registered users in this league.")
    })
}
function register(receivedMessage, args, channel){
    leagueObj.register(receivedMessage, function(callback,err){
        const messageEmbed = new Discord.MessageEmbed()
        if (callback == "1"){ 
            messageEmbed
            .setColor("#5fff00")
            .setDescription(receivedMessage.author.username + " is now registered.")
            channel.send(messageEmbed)
        }
        else if (callback == "2"){
            messageEmbed
            .setColor("#af0000")
            .setDescription(receivedMessage.author.username + " is already registered.")
            channel.send(messageEmbed)
        }
        else if (callback == "3"){
            messageEmbed
            .setColor("#af0000")
            .setDescription("Critical Error. Try again. If problem persists, please reach out to developers.")
            channel.send(messageEmbed)
        }
    })
}
function helpCommand(receivedMessage, arguments){
    let generalChannel = client.channels.cache.get(generalID.getGeneralChatID())
    if (arguments.length == 0){
        const exampleEmbed = new Discord.MessageEmbed()
        .setColor('#0099ff')
        .setTitle('PWP Bot')
        .setURL('')
        .setAuthor('Noah Saldaña', '', '')
        .setDescription('An excellent bot for excellent people')
        .setThumbnail('')
        .addFields(
            { name: '!help', value: 'Where you are now. A list of all available commands with a brief description of each.' },
            { name: '\u200B', value: '\u200B' },
            { name: '!multiply', value: 'Multiply two numbers.', inline: true },
            { name: '!send', value: 'Bot will tell your friends what you really think of them.', inline: true },
            { name: '!log', value: 'Testing function, adds elo to an account. ', inline: true },
            /* @TODO
                Add other commands manually or find a way to programmatically list all commands available + a blurb
            */
        )
        .setImage('')
        .setTimestamp()
        .setFooter('Some footer text here', '');
    
    generalChannel.send(exampleEmbed);
    } else{
        receivedMessage.channel.send("It looks like you need help with " + arguments)

        //@TODO
        //  Take argument user has mentioned and spit back information on it. EX: user types: !help test. Spit back information about test command.
    }
}
function credits(argument, receivedMessage){
    /* @TODO
        Give credit where credit is due 
    */
}
/**
 * 
 * @param {Discord Message Object} receivedMessage Message user submitted
 * 
 * @returns Discord Channel obj to send message to
 */
function getChannelID(receivedMessage) {
    return client.channels.cache.get(receivedMessage.channel.id)
}
client.login("NzE3MDczNzY2MDMwNTA4MDcy.XtZgRg.k9uZEusoc7dXsZ1UFkwtPewA72U")
