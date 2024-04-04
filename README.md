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
4. Run _index.js_ with `nodemon`\
**That's it! Your bot is up and running!**
## BOT'S COMMANDS
- _/register-series_ ``series`` : This command registers the given series that a user wishes to be warned about, saving them in the mongo database.
- _/unregister-series_ ``series`` : This command unregisters a given series that a user has registered.
- _/get-series_ ``user`` : This command returns the registered series from a given user.
## IMPLEMENTATION RESTRICTIONS
Since it's based of _SOFI_'s images, it's currently also limited by what appears on the card. (_SOFI_ limits the card's series names to 18 chars)\
For example:
if you have registered `street fighter` then the bot will look out for that specific string, so if the following card drops:\
![](/segmented_cards/example1.jpg)\
you'll be notified.\
However if you have registered `Blood Blockade Battlefront`, as before the bot will look out for that specific string, so if the following card drops:\
![](/segmented_cards/example2.jpg)\
you **WILL NOT** be notified, because of the SOFI's character limitation, however if you had registered `Blood Blockade` it would work.
