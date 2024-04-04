require('dotenv').config();
const { REST, Routes , ApplicationCommandOptionType } = require('discord.js');

const commands = [
    {
        name: 'register-series',
        description: 'Registers the given series that you wish to be warned about!',
        options: [
            {
                name: 'series',
                description: 'The series you wish to be warned about.',
                type: ApplicationCommandOptionType.String,
                required: true,
            }
        ]
    },
    {
        name: 'unregister-series',
        description : 'Unregisters a given series that you have registered!',
        options: [
            {
                name: 'series',
                description: 'The series you wish to unregister.',
                type: ApplicationCommandOptionType.String,
                required: true,
            }
        ]
    },
    {
        name: 'get-series',
        description : 'Gets the registered series from a given user!',
        options: [
            {
                name: 'user',
                description: 'The given user.',
                type: ApplicationCommandOptionType.User,
                required: true,
            }
        ]
    },
];

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
    try {
        console.log('Registering slash commands...');

        await(rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
            { body: commands }
        ))

        console.log('Slash commands were registered!');
    } catch (error) {
        console.log(`There was an error: ${error}`);
    }
})();