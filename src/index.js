require('dotenv').config();
const { Client, IntentsBitField } = require('discord.js');
const { MongoClient, ServerApiVersion, ObjectID } = require('mongodb');
const { createWorker } = require('tesseract.js');
const fs = require('fs');
const axios = require('axios');
const sharp = require('sharp');
const uri = process.env.MONGODB_URL;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const mongo = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
    try {
      // Connect the client to the server (optional starting in v4.7)
      await mongo.connect();
      // Send a ping to confirm a successful connection
      await mongo.db("admin").command({ ping: 1 });
      console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } catch (error) {
      console.error("Error connecting to MongoDB:", error);
    }
}  
run().catch(console.dir);

const client = new Client({
    intents:[
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMembers,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.MessageContent
    ]
});

// Function to download the image file locally
async function downloadImage(url, outputPath) {
  const response = await axios({
      url: url,
      method: 'GET',
      responseType: 'stream',
  });

  const writer = fs.createWriteStream(outputPath);
  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
  });
}

// Convert from webp to image
async function convertToImage(imageUrl) {
  try {
      console.log("Starting image preprocessing...");

      // Download the image locally
      const imagePath = './input.webp';
      console.log("Downloading image...");
      await downloadImage(imageUrl, imagePath);
      console.log("Image downloaded successfully.");

      // Convert the downloaded image to jpeg format using dwebp
      const outputPath = './output.jpg';
      console.log("Converting image format...");
      const { exec } = require('child_process');
      const command = `dwebp ${imagePath} -o ${outputPath}`;
      exec(command, (error, stdout, stderr) => {
          if (error) {
              console.error("Error converting WebP to png:", error.message);
              return;
          }
          if (stderr) {
              console.error("Error converting WebP to png:", stderr);
              return;
          }
          console.log("Image format conversion completed successfully.");
      });

      // Wait for the conversion process to finish
      await new Promise((resolve) => {
          setTimeout(resolve, 5000); // Adjust the delay as needed based on the image size and system performance
      });

      // Read the converted image using JIMP
      console.log("Loading converted image...");
      const imageBuffer = fs.readFileSync(outputPath);
      console.log("Converted image loaded successfully.");

  } catch (error) {
      console.error('Error preprocessing image:', error);
      throw error;
  }
}

async function segmentCards(inputImagePath, outputDir, segmentWidth, segmentHeight) {
  try {
    // Create the output directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }

    // Load the input image
    const image = sharp(inputImagePath);

    // Get the image metadata (width and height)
    const metadata = await image.metadata();
    const width = metadata.width;
    const height = metadata.height;

    console.log('Image dimensions:', width, 'x', height);

    // Calculate the number of segments
    const numSegments = 3;

    console.log('Number of segments:', numSegments);

    // Calculate the segment width
    const segmentWidth = Math.round(width / numSegments);

    // Extract and save each card
    for (let i = 0; i < numSegments; i++) {
      const left = i * segmentWidth;
      const top = 0;
      const right = Math.min(left + segmentWidth, width);
      const bottom = height;

      console.log(`Segment ${i + 1} bounds: left=${left}, top=${top}, right=${right}, bottom=${bottom}`);

      // Define the output file path for each segment
      const outputFile = `${outputDir}/card_${i + 1}.jpg`;

      await image
        .clone() // Clone the image to avoid affecting subsequent operations
        .extract({ left, top, width: right - left, height: bottom - top }) // Extract the segment
        .toFile(outputFile); // Save the extracted segment

      console.log(`Segment ${i + 1} saved to ${outputFile}`);
    }

    console.log('Image segmentation complete.');
  } catch (err) {
    console.error('Error segmenting image:', err);
    throw err; // Re-throw the error to be handled by the caller
  }
}


// Function to perform OCR on the preprocessed image
async function performOCR(cardImagePaths) {
  try {
    const worker = await createWorker('eng');

    // Array to store extracted text from each card
    const extractedTexts = [];

    // Load the worker and initialize OCR for each card
    //await worker.load();
    //await worker.loadLanguage('eng');
    //await worker.initialize();

    // Iterate over each card image
    for (const cardImagePath of cardImagePaths) {
      try {
        const { width, height } = await getImageDimensions(cardImagePath); // Get image dimensions
        const roiHeight = Math.round(height * 0.22); // Adjust the percentage as needed | 0.2 was the previous one
        const roiTop = height - roiHeight;

        // Perform OCR on the defined ROI
        const { data: { text } } = await worker.recognize(cardImagePath, { rectangle: { top: roiTop, left: 0, width, height: roiHeight } });
        extractedTexts.push(text.trim()); // Push the extracted text to the array
      } catch (error) {
        console.error(`Error processing OCR for image ${cardImagePath}:`, error);
        extractedTexts.push(null); // Push null if OCR fails for the current card
      }
    }

    // Terminate the worker
    await worker.terminate();

    return extractedTexts;
  } catch (error) {
    console.error('Error performing OCR:', error);
    return Array(cardImagePaths.length).fill(null); // Return an array of null values if an error occurs
  }
}

async function getImageDimensions(imagePath) {
  try {
    console.log('Image path:', imagePath); // Log the image path
    const image = sharp(imagePath);
    const metadata = await image.metadata();
    const width = metadata.width;
    const height = metadata.height;
    return { width, height };
  } catch (error) {
    console.error('Error getting image dimensions:', error);
    return { width: 0, height: 0 };
  }
}

// Main function to process the image and perform OCR
async function processImageAndPerformOCR(imageUrl) {
    try {
        // Convert to image before preprocess
        await convertToImage(imageUrl);

        // Preprocess image before OCR
        //await preprocessImage('./output.jpg', './output.jpg');

        // Segment image into other images
        await segmentCards('output.jpg','segmented_cards',1008,200) //antes estava (1008,524)

        // Perform OCR on the preprocessed image
        const ocrTexts = await performOCR(['segmented_cards/card_1.jpg','segmented_cards/card_2.jpg','segmented_cards/card_3.jpg']);

        // Remove newline characters from the extracted text
        const cleanedTexts = ocrTexts.map(text => text.replace(/\n/g, ' '));

        console.log('OCR Text:', cleanedTexts);
        return cleanedTexts;
    } catch (error) {
        console.error('Error performing OCR:', error);
        return null;
    }
}

client.on('ready', (c) => {
    console.log(`${c.user.tag} is online!`);
});

client.on('interactionCreate', async (interaction) => {
    if(!interaction.isChatInputCommand()) return;
    
    if(interaction.commandName == 'register-series') {
        const seriesName = interaction.options.getString('series').toLowerCase();
        const userId = interaction.user.id;

        try {
            const seriesCollection = mongo.db('SofiWisher').collection('series');
            
            // Find the user's document in the collection
            const userSeries = await seriesCollection.findOne({ userId: userId });
      
            // If the user doesn't have a document yet, create one
            if (!userSeries) {
              await seriesCollection.insertOne({ userId: userId, series: [seriesName] });
            } else {
              // If the user already has a document, update it to add the new series
              await seriesCollection.updateOne({ userId: userId }, { $addToSet: { series: seriesName } });
            }

            await interaction.reply(`'${seriesName}' was registered successfully!`);
          } catch (error) {
            console.error('Error registering series:', error);
            await interaction.reply('An error occurred while registering the series.');
          }
    } else if (interaction.commandName === 'unregister-series') {
        const seriesName = interaction.options.getString('series').toLowerCase();
        const userId = interaction.user.id;
    
        try {
          const seriesCollection = mongo.db('SofiWisher').collection('series');
          
          // Find the user's document in the collection
          const userSeries = await seriesCollection.findOne({ userId: userId });
          if (!userSeries) {
            await interaction.reply("You haven't registered any series yet.");
            return;
          }
    
          // Remove the specified series from the user's document
          const updatedSeries = userSeries.series.filter(series => series !== seriesName);
          await seriesCollection.updateOne({ userId: userId }, { $set: { series: updatedSeries } });
    
          await interaction.reply(`'${seriesName}' was unregistered successfully!`);
        } catch (error) {
          console.error('Error unregistering series:', error);
          await interaction.reply('An error occurred while unregistering the series.');
        }

      } else if(interaction.commandName === 'get-series') {
        const getUserId = interaction.options.getUser('user').id;
        try {
          const seriesCollection = mongo.db('SofiWisher').collection('series');
          
          // Find the user's document in the collection
          const userSeries = await seriesCollection.findOne({ userId: getUserId });
    
          if (!userSeries || userSeries.series.length === 0) {
              await interaction.reply(`The user ${interaction.options.getUser('user').displayName} hasn't registered any series yet.`);
          } else {
              const userSeriesList = userSeries.series.join(', ');
              await interaction.reply(`Series registered by ${interaction.options.getUser('user').displayName}: ${userSeriesList}`);
          }
        } catch (error) {
          console.error('Error fetching user series:', error);
          await interaction.reply('An error occurred while fetching user series.');
        }

      }
});

client.on('messageCreate', async (msg) => {
  if(msg.author.bot && msg.author.username === 'SOFI' && msg.content.includes('is **dropping** cards')) { // Confirm it's SOFI bot's drop!
    const attachment = msg.attachments.first(); // get SOFI drop image
    if (attachment && attachment.contentType.startsWith('image/')) { // read the SOFI drop image's content
        try {
            const texts = await processImageAndPerformOCR(attachment.url);
            console.log('Text extracted from the image:', texts);

            // Query MongoDB to retrieve all users and their associated series
            const seriesCollection = mongo.db('SofiWisher').collection('series');
            const allUsers = await seriesCollection.find({}).toArray();

            // Iterate over each user
            for (const user of allUsers) {
              // Iterate over each extracted text
              for (const text of texts) {
                // Convert extracted text and series names to lowercase for case-insensitive comparison
                const textLowerCase = text.toLowerCase();
                const userSeriesList = user.series.map(series => series.toLowerCase());

                // Check if any of the extracted text (in lowercase) matches the user's series (also converted to lowercase)
                const matchedSeries = userSeriesList.filter(series => textLowerCase.includes(series));
                if (matchedSeries.length > 0) {
                  console.log('something came up :)');
                  // Send a Discord message to the user
                  const userToMessage = await client.users.fetch(user);
                  await msg.reply(`<@${userToMessage.userId}> the series ${matchedSeries.join(', ')} have been found !`);
                } else {
                  console.log('nothing came up :(');
                }
              }
            }
        } catch (error) {
          console.error('Error processing image and performing OCR:', error);
        }
      }
    }
});

client.login(process.env.TOKEN);