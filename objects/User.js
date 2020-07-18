/**
 * User Object
 *
 * All user based functionality.
 */

const Alias = require('../Schema/Alias')
const Deck = require('../Schema/Deck')
const User = require('../Schema/Users')
const Matches = require('../Schema/Games')
const DeckHelper = require('../Helpers/DeckHelper')
const { lookup } = require('dns')

module.exports = {

    /**
     * Get user league profile
     */
    profile(receivedMessage, args) {
        
        var currentSeason = "1" //UPDATE ME
        var lookUpID
        return new Promise((resolve, reject)=>{
            if (typeof args[0] === 'undefined'){
                args[0] = "Not Defined"
                lookUpID = "<@!" + receivedMessage.author.id + ">"
                console.log("no argument provided")
            }
            else{
                lookUpID = args[0]
            }
            var conditionalQuery
            var passingResult
            var passedArray = new Array()
            
            //Query
            if (args[0] == "Not Defined"){
                conditionalQuery = {_server: receivedMessage.guild.id, _season: currentSeason, $or: 
                    [
                    {_player1: "<@!"+receivedMessage.author.id+">"}, 
                    {_player2: "<@!"+receivedMessage.author.id+">"},
                    {_player3: "<@!"+receivedMessage.author.id+">"},
                    {_player4: "<@!"+receivedMessage.author.id+">"},
                    ]
                }
            }
            else{
                conditionalQuery = {_server: receivedMessage.guild.id, _season: currentSeason, $or: 
                    [
                    {_player1: args[0]}, 
                    {_player2: args[0]},
                    {_player3: args[0]},
                    {_player4: args[0]},
                    ]
                }
            }
            Matches.find(conditionalQuery, function(err, res){
                if (res){
                    passingResult = res
                }
                else{
                    resolve("Error 1")
                }
            }).then(function(passingResult){
                if (passingResult != ""){
                    var matchResults = []
                    for (var i=0; i <passingResult.length; i++){
                        var exists = matchResults.find(el => el[0] === passingResult[i]._player1Deck)
                        if (exists) {
                            exists[1] += 1;
                          } else {
                            matchResults.push([passingResult[i]._player1Deck, 1, 0]);
                          }
                        var exists2 = matchResults.find(el => el[0] === passingResult[i]._player2Deck)
                        if (exists2) {
                            exists2[2] += 1;
                            } else {
                            matchResults.push([passingResult[i]._player2Deck, 0, 1]);
                            } 
                        var exists3 = matchResults.find(el => el[0] === passingResult[i]._player3Deck)
                        if (exists3) {
                            exists3[2] += 1;
                            } else {
                            matchResults.push([passingResult[i]._player3Deck, 0, 1]);
                            }
                        var exists4 = matchResults.find(el => el[0] === passingResult[i]._player4Deck)
                        if (exists4) {
                            exists4[2] += 1;
                            } else {
                            matchResults.push([passingResult[i]._player4Deck, 0, 1]);
                            }
                    }
                    passedArray.push("Profile Look Up",matchResults, currentSeason, lookUpID)
                   
                }
                else{
                    resolve("Can't find user")
                }
            }).then(function(){
                let query = {_server: receivedMessage.guild.id, _season: currentSeason, _mentionValue: lookUpID}
                User.find(query,function(err, res){
                    passedArray.push(res[0]._elo, res[0]._currentDeck)
                    resolve(passedArray)
                })
            })
        })
    },
    sortFunction(a, b) {
        if (a[0] === b[0]) {
            return 0;
        }
        else {
            return (a[0] < b[0]) ? -1 : 1;
        }
    },
  
    /**
     * 
     * @param {Discord Message Object} message 
     * 
     * @returns {2D Array} Array of match Arrays sorted from most recent to least recent.
     * TODO: Server implementation
     */
    recent(message, user = null, server = null) {
        gameArr = []
        const games = require('../Schema/Games')
        if (user == null) {
            id = "<@!"+message.author.id+">"
        }
        else {
            id = user
        }
        return new Promise((resolve, reject) => {
            if (server == null) {
                findQuery = {$and : [
                                        {
                                            $or: [
                                                {_player1: id},
                                                {_player2: id},
                                                {_player3: id},
                                                {_player4: id}
                                            ]
                                    },
                                    {
                                        _Status: "FINISHED"
                                    },
                                    {
                                        _server: message.guild.id
                                    }
                            ]
                }
            }
            else {
                findQuery = {_Status: "FINISHED", _server: message.guild.id}
            }
            games.find(findQuery).then((docs) => {
                docs.forEach((doc) => {
                    timestamp = doc._id.toString().substring(0,8)
                    date = new Date( parseInt( timestamp, 16 ) * 1000)
                    gameArr.push([date, doc._match_id, doc._server, doc._season, doc._player1, doc._player2, doc._player3, doc._player4, doc._player1Deck, doc._player2Deck, doc._player3Deck, doc._player4Deck, doc._Status, doc._player1Confirmed, doc._player2Confirmed, doc._player3Confirmed, doc._player4Confirmed,])
                });
            }).then(function() {
                gameArr.sort(module.exports.sortFunction)
                resolve(gameArr)
            });
        })

    },
    /**
     * Adds a deck to your deck collection
     * TODO: Output spits out like "kess storm" instead of "Kess Storm"... small but if someone has time
     */ 
    addToCollection(receivedMessage, args, callback){
        const user = require('../Schema/Users')
        const deck = require('../Schema/Deck')

        var sanitizedString = ""
        var cleanedArg = ""
        args.forEach(arg => {
            sanitizedString = sanitizedString + " " + arg
        });
        cleanedArg = sanitizedString.slice(1)

        let findQuery = {_id: "<@!"+receivedMessage.author.id+">"}
        let updateQuery = {$addToSet: {_deck: [{'_id': 0,'Deck': cleanedArg, "Wins":0, "Losses":0}]}}
        let aliasCheckQuery = {_alias: cleanedArg}

        deck.findOne(aliasCheckQuery, function(err, res){
            if (res){
                user.findOne(findQuery, function(err, res){
                    if (res) {
                        user.updateOne(findQuery,updateQuery, function(err, res){
                            if (res) {
                                callback("Successfully added " + "**"+cleanedArg+"**"
                                + " to " + "**"+receivedMessage.author.username+"**" + "'s profile")
                            }
                            else {
                                callback("Error. Unable to update collection. Please try again.")
                            }
                        })
                    }
                    else {
                        callback("User not found. Try registering first !register")
                    }
                })
            }
            else{
                callback("Alias not registered. Try !listdecks to see available decks")
            }
        })
    },
    
    /** 
     * Lists your deck collection
    */
    listCollection(receivedMessage, args, callback){
        const user = require('../Schema/Users')
        let query = {_name: receivedMessage.author.id}
        user.findOne(query, function(err, res){
            callback(res)
        })
    },
    
    /**
     * Returns currently registered Deck name
     */
    currentDeck(receivedMessage, args, callback) {
        const user = require('../Schema/Users')
        const deck = require('../Schema/Deck')
        const alias = require('../Schema/Alias')
        const callBackArray = new Array()

        let findQuery = {
            _mentionValue: "<@!"+receivedMessage.author.id+">",
            _server: receivedMessage.guild.id
        }
        user.findOne(findQuery, function(err, res){
            if (res) {
                let findQuery = {_alias: res._currentDeck.toLowerCase()}
                deck.findOne(findQuery, function(err, res){
                    if (res) {
                        callBackArray.push(res._link)
                        callBackArray.push(res._name)
                        callback(callBackArray)
                    }
                    else {
                        callback("Error: 2")
                    }
                })
            }
            else {
                callback("Error: 1")
            }
        })
    },
    /**
     * Sets the users current Deck
     */
    useDeck(receivedMessage, args, callback){
        const user = require('../Schema/Users')
        const deck = require('../Schema/Deck')
        const alias = require('../Schema/Alias')

        //Cleaning arguments and testing if they exist
        let argsWithCommas = args.toString()
        let argsWithSpaces = argsWithCommas.replace(/,/g, ' ');
        let argsLowerCase = argsWithSpaces.toLowerCase()
        let splitArgs = argsLowerCase.split(" | ")

        //Cleaning up deckname
        let deckname
        let deckNameFormatted
        try {
            deckname = splitArgs[0]
            deckNameFormatted = deckname.toLowerCase().split(' ').map(function(word) {
                return word[0].toUpperCase() + word.substr(1);
            }).join(' ');
        }catch{
            deckname = ""
            deckNameFormatted = ""
        }
        
        //Cleaning up aliasname
        let aliasName
        let aliasNameFormatted
        try {
            aliasName = splitArgs[1]

            aliasNameFormatted = aliasName.toLowerCase().split(' ').map(function(word) {
                return word[0].toUpperCase() + word.substr(1);
            }).join(' ');
        }catch{
            aliasName = ""
            aliasNameFormatted = ""
        }

        //Queries

        let aliasFindQuery = {_name: aliasNameFormatted, _server: receivedMessage.guild.id}
        let singleArgAliasFindQuery = {_name: deckNameFormatted, _server: receivedMessage.guild.id}

        let findingUserQuery = {_mentionValue: "<@!"+receivedMessage.author.id+">", _server: receivedMessage.guild.id}
        let idQuery = {_mentionValue: "<@!"+receivedMessage.author.id+">"}

        let addToSet = {_currentDeck: aliasNameFormatted, $addToSet: {_deck: [{'_id': 0,'Deck': deckNameFormatted, "Alias": aliasNameFormatted, "Wins":0, "Losses":0}]}}
        let singleArgAddToSett = {_currentDeck: deckNameFormatted, $addToSet: {_deck: [{'_id': 1,'Deck': deckNameFormatted, "Alias": deckNameFormatted, "Wins":0, "Losses":0}]}}

        let updateCurrent = {_currentDeck: aliasNameFormatted}
        let singleArgUpdateCurrent = {_currentDeck: deckNameFormatted}

        let dupQuery = {_mentionValue: "<@!"+receivedMessage.author.id+">", _server: receivedMessage.guild.id, _deck: {$elemMatch:{Alias:aliasNameFormatted}}}
        let singleArgDupQuery = {_mentionValue: "<@!"+receivedMessage.author.id+">", _server: receivedMessage.guild.id, _deck: {$elemMatch:{Alias:deckNameFormatted}}}

        if (splitArgs.length == 1){
            user.findOne(findingUserQuery, function(err, userResult){
                if (userResult){
                    if (splitArgs[0] == "rogue"){
                        callback("5")
                    }else{
                        alias.findOne(singleArgAliasFindQuery, function(err, aliasSearchRes){
                            if (aliasSearchRes){
                                user.findOne(singleArgDupQuery, function(err, checkDupResult){
                                    if (checkDupResult){
                                        user.updateOne(idQuery, singleArgUpdateCurrent, function(err, addingResult){
                                            if (addingResult){
                                                let callBackArray = new Array();
                                                callBackArray.push("4")
                                                callBackArray.push(deckNameFormatted)
                                                callback(callBackArray)
                                            }else{
                                                callback("3")
                                            }
                                        }) 
                                    }
                                    else{
                                        user.updateOne(idQuery, singleArgAddToSett, function(err, addingResult){
                                            if (addingResult){
                                                let callBackArray = new Array();
                                                callBackArray.push("4")
                                                callBackArray.push(deckNameFormatted)
                                                callback(callBackArray)
                                            }else{
                                                callback("3")
                                            }
                                        }) 
                                    }
                                })
                            }
                            else{
                                let callBackArray = new Array();
                                callBackArray.push("2")
                                callBackArray.push(deckNameFormatted)
                                callback(callBackArray)
                            }
                        })
                    }
                }else{
                    callback("1")
                }
            })
        }
        else if (splitArgs[1] == undefined || splitArgs.length > 2){
            callback("Error. Try again with the format !use <DeckName> | <Alias>. Ex: !use Godo | Godo.")
        }
        else{
            user.findOne(findingUserQuery, function(err, userResult){
                if (userResult){
                    alias.findOne(aliasFindQuery, function(err, aliasSearchRes){
                        if (aliasSearchRes){
                            user.findOne(dupQuery, function(err, checkDupResult){
                                if (splitArgs[1] == "rogue"){
                                    user.updateOne(idQuery, addToSet, function(err, addingResult){
                                        if (addingResult){
                                            let callBackArray = new Array();
                                            callBackArray.push("4")
                                            callBackArray.push(aliasNameFormatted)
                                            callback(callBackArray)
                                        }else{
                                            callback("3")
                                        }
                                    }) 
                                }
                                else if (checkDupResult){
                                    user.updateOne(idQuery, updateCurrent, function(err, addingResult){
                                        if (addingResult){
                                            let callBackArray = new Array();
                                            callBackArray.push("4")
                                            callBackArray.push(aliasNameFormatted)
                                            callback(callBackArray)
                                        }else{
                                            callback("3")
                                        }
                                    }) 
                                }
                                else{
                                    let callBackArray = new Array();
                                            callBackArray.push("5")
                                            callBackArray.push(aliasNameFormatted)
                                            callback(callBackArray)
                                }
                            })
                             
                        }
                        else{
                            let callBackArray = new Array();
                            callBackArray.push("2")
                            callBackArray.push(aliasNameFormatted)
                            callback(callBackArray)
                        }
                    })
                    
                }else{
                    callback("1")
                }
            })
            
        }
    }
}
