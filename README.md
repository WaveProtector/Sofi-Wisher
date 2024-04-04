# README
## INTRODUCTION
This is a discord bot made with _Node.js_ that warns users about a character from a series they like have droped in the *SOFI* bot drop command.
It uses:
- MongoDB (to register the user's series)
- tesseract.js (to read the text from the images (OCR))
- axios (to download the image from the url attachment)
- sharp (to segment the cards so that the worker doesn't have issues reading the text from the card)

## HOW TO USE
1. Make sure to create a _.env_ file and fill it with the respective credentials (TOKEN, GUILD_ID, CLIENT_ID(the bot's id), MONGODB_URL).
2. Invite the bot to your server.
3. Run _register-commands.js_ with `node src/register-commands.js`
4. Run _index.js_ with `nodemon`
That's it! Your bot is up and running!

## BOT'S COMMANDS
- _/register-series_ ``series`` : This command registers the given series that a user wishes to be warned about, saving them in the mongo database.
- _/unregister-series_ ``series`` : This command unregisters a given series that a user has registered.
- _/get-series_ ``user`` : This command returns the registered series from a given user.
