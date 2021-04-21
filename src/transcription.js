const path = require('path');

const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffprobePath = require('@ffprobe-installer/ffprobe').path;

const ffmpeg = require('fluent-ffmpeg');

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

const video = path.join(__dirname, '../Roteiro.mp4');
const audio = path.join(__dirname, '../Roteiro.mp3');

const fs = require('fs');
const { IamAuthenticator } = require('ibm-watson/auth');
const SpeechToTextV1 = require('ibm-watson/speech-to-text/v1');

const credentials = require('./apikey-ibm-cloud.json');

async function transcription() {
    console.log('criando o arquivo mp3', audio);
    extractAudio().then(() => {    
        console.log('iniciando a transcrição');
        speechToText();
    }).catch((e) => { console.log('erro:', e) });

    async function extractAudio() {
        return new Promise((resolve, reject) => {
            try {
                const command = ffmpeg(video);

                command.format('mp3').save(audio).on('end', () => {
                    console.log('Processamento Finalizado');
                    resolve(audio);
                  });
                
                
            } catch (error) {
                reject(error);
            }
        });
    }

    async function speechToText() {
        const speechToText = new SpeechToTextV1({
            authenticator: new IamAuthenticator({
              apikey: credentials.apikey,
            }),
            serviceUrl: credentials.url,
          });
          
          const params = {
            objectMode: false,
            contentType: 'audio/mp3',
            model: 'pt-BR_BroadbandModel',
            keywords: ['roteiro', 'argumento', 'guião'],
            keywordsThreshold: 0.5,
            maxAlternatives: 3,
          };
          
          // Create the stream.
          const recognizeStream = speechToText.recognizeUsingWebSocket(params);
          
          // Pipe in the audio.
          fs.createReadStream(audio).pipe(recognizeStream);
          
          /*
           * Uncomment the following two lines of code ONLY if `objectMode` is `false`.
           *
           * WHEN USED TOGETHER, the two lines pipe the final transcript to the named
           * file and produce it on the console.
           *
           * WHEN USED ALONE, the following line pipes just the final transcript to
           * the named file but produces numeric values rather than strings on the
           * console.
           */
          recognizeStream.pipe(fs.createWriteStream('transcription.txt'));
          
          /*
           * WHEN USED ALONE, the following line produces just the final transcript
           * on the console.
           */
          recognizeStream.setEncoding('utf8');
          
          // Listen for events.
          recognizeStream.on('data', function(event) { onEvent('Data:', event); });
          recognizeStream.on('error', function(event) { onEvent('Error:', event); });
          recognizeStream.on('close', function(event) { onEvent('Close:', event); });        
    }

    
    // Display events on the console.
    function onEvent(name, event) {
        console.log(name, JSON.stringify(event, null, 2));
    };

}

module.exports = transcription;