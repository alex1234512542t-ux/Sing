const SerpApi = require('google-search-results-nodejs');
const search = new SerpApi.GoogleSearch("59c3b8ca7be13a9667b277409b78c7e809a29439cca2d232175a860d932c73db");
const discord = require('discord.js');
const client = new discord.Client();
const ytdl = require('ytdl-core');
const ytSearch = require('yt-search');

const fs = require('fs');
const JSONFILE = "./playlists.json";
const nsfw = require("./extra-words.json");
const queue = new Map();

const intelligenceInsults = ['dumb', 'stupid', 'idiotic', 'moronic', 'foolish', 'witless', 'mindless'];
const insults = ['fuck', 'bitch', 'cunt','dickhead', 'shithead', 'butthead', 'buttface', 'duck', 'pp head', 'poo poo head']

const status = ["sleeping", "awake and ready to play music", ":D", "happy :3", "sad :'(", "doing alright :3", "doing ok", "how come you don't ask Sing how she's doing :((", "play some lofi :D", "wanna listen to some music :3", "what's up :3", ":3", "how are you :3", "what are we listening to? :3", "let's listen to something happy :3", "let's listen to something sad :'((", "let's listen to rock >:3", "let's listen to something chill :3", "let's listen to some lofi :3"];

const getRandomNum = (max => { return Math.floor(Math.random() * max); });

let repeat = false;

//#region music

const createUrl = (args, startIndex) => {
    let urlContent = "";
    for (let i = startIndex; i < args.length; i++) {
        urlContent += `${args[i]} `
    }
    return urlContent;
};

async function execute(message, args) {
    for (let i = 0; i < args.length; i++) {
        console.log(args[i]);
    }
    //Checking for the voicechannel and permissions (you can add more permissions if you like).
    const voice_channel = message.member.voice.channel;
    if (voice_channel === null) {
        message.channel.send(`You need to be in a channel to use ${args[0]}\n${message.author} you ${intelligenceInsults[getRandomNum(intelligenceInsults.length)]} ${insults[getRandomNum(insults.length)]} >:3`);
        return;
    }
    const permissions = voice_channel.permissionsFor(message.client.user);

    if (!permissions.has('CONNECT') === null) {
        message.channel.send('You dont have the correct permissins');
        return;
    }
    if (!permissions.has('SPEAK')) {
        message.channel.send('You dont have the correct permissins');
        return;
    }

    const server_queue = queue.get(message.guild.id);
    let text = message.content;


    if (args[0] === "$play") {
        // if (!permissions.has('CONNECT')) return message.channel.send('You dont have the correct permissins');
        // if (!permissions.has('SPEAK')) return message.channel.send('You dont have the correct permissins');
        if (args.length < 2) return message.channel.send(`You need to enter the song name you ${intelligenceInsults[getRandomNum(intelligenceInsults.length)]} ${insults[getRandomNum(insults.length)]} >:3`); //returns if song hasn't been chosen

        let song = {};


        let url = createUrl(args, 1);

        console.log(createUrl(args, 1));

        //If the first argument is a link. Set the song object to have two keys. Title and URl.
        if (ytdl.validateURL(url)) { //validates url
            const song_info = await ytdl.getInfo(url); //gets info

            console.log(song_info);
            song = { title: song_info.videoDetails.title, url: song_info.videoDetails.video_url } //
        } else {
            //If there was no link, we use keywords to search for a video. Set the song object to have two keys. Title and URl.
            const video_finder = async (query) => {
                const video_result = await ytSearch(query);
                return (video_result.videos.length > 1) ? video_result.videos[0] : null;
            }

            const video = await video_finder(args.join(' '));
            if (video) {
                song = { title: video.title, url: video.url }
            } else {
                message.channel.send('Error finding video.');
            }
        }

        //If the server queue does not exist (which doesn't for the first video queued) then create a constructor to be added to our global queue.
        if (!server_queue) {

            const queue_constructor = {
                voice_channel: voice_channel,
                text_channel: message.channel,
                connection: null,
                songs: []
            }

            //Add our key and value pair into the global queue. We then use this to get our server queue.
            queue.set(message.guild.id, queue_constructor);
            queue_constructor.songs.push(song);

            //Establish a connection and play the song with the vide_player function.
            try {
                const connection = await voice_channel.join();
                queue_constructor.connection = connection;
                video_player(message, message.guild, queue_constructor.songs[0], false);
            } catch (err) {
                queue.delete(message.guild.id);
                message.channel.send("There was an error connecting :'3");
                throw err;
            }
        } else {
            server_queue.songs.push(song);
            return message.channel.send(`**${song.title}** ${song.url}\nhas been added to the queue :3`);
        }
    }

    else if (args[0] ==='$skip') skip_song(message, server_queue, voice_channel, permissions);
    else if (args[0] ==='$stop') stop_song(message, server_queue);
    else if (args[0] ==='$queue') get_queue(message, server_queue);
    else if (args[0] ==='$Plist-play') playlist_play(message, args);
    else if (args[0] ==='$Plist-add') playlist_add(message, args);
    //else if (text.startsWith("$remove")) remove_song(message, server_queue, args[1]);
    else if (args[0] ==="$author") message.channel.send("알렉스#9488 bitch :3");
    else if (args[0] ==="$JSON") {message.channel.send("```js"+'\n'+loadJSON(JSONFILE))+'\n'+"```" }
    else if (args[0] === "$repeat") {
        repeat = !repeat;
        message.channel.send(`repeat has been ${ repeat ? "activated" : "deactivated"}`);
    }
    else { message.channel.send(`${message.author} ${args[0]} isn't a vaild command you ${intelligenceInsults[getRandomNum(intelligenceInsults.length)]} ${insults[getRandomNum(insults.length)]} >:3`) }

}

// const remove_song = (message, server_queue) => {
//     const song_queue = queue.get(guild.id);
//     song_queue.songs.forEach((title) => {
//         returnMsg += `♪**${title.title}**♪  ${i === 0 ? "is currently playing ! :3" : `is in position ${i}`}\n${title.url}\n`;
//         i++;
//     })
// }

//#region json playlist

function loadJSON(filename = ' ') {
    return JSON.parse(fs.existsSync(filename) ? fs.readFileSync(filename).toString() : "null");
}

function saveJSON(filename = '""', json = '""') {
    return fs.writeFileSync(filename, JSON.stringify(json));
}

async function findSongs(message, name) {
        try {
            const playlist = loadJSON(JSONFILE);
            for (let i = 0; i < playlist.container.length; i++) {
                if (parseInt(playlist.container[i].author) == message.author.id) {
                    //passes id test
                    for (let index = 0; index < playlist.container[i].playlists.length; index++) {
                        //passes does itterate through list
                        if (playlist.container[i].playlists[index].name == name) {
                            //message.channel.send("```json" + "\n" + playlist.container[i].playlists[index].songs + "\n" + "```");
                            //currentPlayList = playlist.container[i].playlists[index].songs;
                            for (let j = 0; j < playlist.container[i].playlists[index].songs.length; j++) {
                                let val = `$play_${playlist.container[i].playlists[index].songs[0]}`.split('_');
                                await execute(message, val);
                            }
                            break;
                        } else {
                            message.channel.send(`cannot find playlist **${name}** sorry :3`);
                        }
                    }
                }else {
                    create(message);
                    message.channel.send(`cannot find playlist **${name}** sorry :3`);
                }
                saveJSON(JSONFILE, playlist);
            }
        } catch (err) {
        console.log('Error parsing JSON string:', err)
    }
}

const playlist_play = async (message, args) => {
    if (args.length < 2) {
        message.channel.send(`${message.author} you ${intelligenceInsults[getRandomNum(intelligenceInsults.length)]} ${insults[getRandomNum(insults.length)]} >:3\n${args[0]} ${args[1] === undefined ? "you need to enter a playlist name" : args[1]} to create a playlist >:3`);
        return;
    }
    findSongs(message, args[1]);
}

const create = (message) => {
    const playlists = loadJSON(JSONFILE);
    playlists.container.push({
        "author": message.author.id,
        "playlists": []
    });
    saveJSON(JSONFILE, playlists);

}

const playlist_create = (message, args) => {
    if (args.length < 2) {
        message.channel.send(`${message.author} you ${intelligenceInsults[getRandomNum(intelligenceInsults.length)]} ${insults[getRandomNum(insults.length)]} >:3\n${args[0]} ${args[1] === undefined ? "you need to enter a playlist name" : args[1]} to create a playlist >:3`);
        return;
    }
    const playlistName = createUrl(args, 1);
    const playList = loadJSON(JSONFILE);
    for (let i = 0; i < playList.container.length; i++) {
        if (playList.container[i].author == measureMemory.author.id) {
            playList.container[i].playlists.push({
                "name": playlistName,
                "songs":[]
            });
            break;
        }
    }
    saveJSON("./");
}

const playlist_add = (message, args) => {
    if (args.length < 3) {
        message.channel.send(`${message.author} you ${intelligenceInsults[getRandomNum(intelligenceInsults.length)]} ${insults[getRandomNum(insults.length)]} >:3\n${args[0]} ${args[1] === undefined ? "you need to enter a playlist name" : args[1]} ${args[2] === undefined ? "you need to enter a song name" : args[2]} to add to a playlist >:3`);
    }
    let songName = createUrl(args, 2);
    let name = args[1];
    const playlist = loadJSON(JSONFILE);
    for (let i = 0; i < playlist.container.length; i++) {
        if (playlist.container[i].author == message.author.id) {
            for (let j = 0; j < playlist.container[i].playlists.length; j++) {
                console.log(playlist.container[i].playlists[j]);
                if (playlist.container[i].playlists[j].name == name) {
                    playlist.container[i].playlists[j].songs.push(songName);
                    message.channel.send(`added ${songName} to ${name} :3`);
                    break;
                }
            }
        }
    }
    saveJSON(JSONFILE, playlist);

}
//#endreigon

const get_queue = (message, server_queue) => {
    if (!message.member.voice.channel) return message.channel.send('You need to be in a channel to execute this command :3');
    const song_queue = queue.get(message.guild.id);
    if (queue.size <= 0) return message.channel.send("Sorry there is nothing in queue right now");
    let i = 1;
    console.log(song_queue);
    let returnMsg = ``;
    song_queue.songs.forEach((title) => {
        returnMsg += `♪**${i === 1 ? "is currently playing ! :3**♪  " : `position ${i} in queue**♪  `}\n${title.url}\n`;
        i++;
    })
    message.channel.send(returnMsg);
};

const video_player = async (message, guild, song, replay) => {
    const song_queue = queue.get(guild.id);

    //If no song is left in the server queue. Leave the voice channel and delete the key and value pair from the global queue.
    if (!song) {
        song_queue.voice_channel.leave();
        queue.delete(guild.id);
        changeStatus();
        message.channel.send("that's all folks :3");
        return;
    }
    const stream = ytdl(song.url, { filter: 'audioonly' });
    song_queue.connection.play(stream, { seek: 0, volume: 0.5 })
        .on('finish', () => {
            if (repeat) {
                video_player(message, guild, song_queue.songs[0], true);
            } else {
                song_queue.songs.shift();
                video_player(message, guild, song_queue.songs[0], false);
            }
    });
    client.user.setActivity(song.title);
    if (!replay) {
        await song_queue.text_channel.send(`Now playing ♪**${song.title}**\n${song.url}♪ :3\n${repeat ? "repeat is on":""}`)
    }
}

const skip_song = (message, server_queue, voice_channel, permissions) => {

    if (!message.member.voice.channel) return message.channel.send('You need to be in a channel to execute this command :3');
    if(!server_queue){
        return message.channel.send(`There are no songs in queue :3`);
    }
    server_queue.connection.dispatcher.end();
    const song_queue = queue.get(message.guild.id);
    message.channel.send(song_queue.songs[0].title + " skipped :3");
}

function changeStatus() {
    client.user.setActivity(status[getRandomNum(status.length)]);
}

const stop_song = (message, server_queue, voice_channel, permissions) => {
    if (!message.member.voice.channel) return message.channel.send('You need to be in a channel to execute this command :3');
    server_queue.songs = [];
    server_queue.connection.dispatcher.end();
    message.channel.send('playing stopped :3');
    changeStatus();
}
//#endregion

client.on('ready', () => {
    client.user.setActivity(status[Math.floor(Math.random() * status.length)]);
    console.log("ready");
});

let again = false;

client.on('message', async (message) => {
    if (message.content.startsWith('$')) {
        execute(message, message.content.split(" "));
    } else if (message.mentions.has(client.user)) {
        message.channel.send(`${message.author} stop messaging me you ${intelligenceInsults[getRandomNum(intelligenceInsults.length)]} ${insults[getRandomNum(insults.length)]} >:3`);
    }
    else if (message.content.includes(":(") ) {
        message.channel.send(`${message.author} ha you're sad :3`);
    }
});

client.login('ODg4OTg4MzQ3MzcwOTgzNDQ1.YUas6g.RH3WwTUAldKx9f6QF8j5DyqtALE');
