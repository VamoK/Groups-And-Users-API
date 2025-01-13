const jquery = require('jquery');
const fs = require('fs');
const fsa = require('fs/promises');
const moment = require('moment');
const path = require('path');
//const { method } = require('lodash');
//const { method } = require('lodash');
// const fetch = require('node-fetch'); // Uncomment if you use node-fetch

// Remove existing runresults.txt if it exists, then recreate it
const logFilePath = path.join(__dirname, 'runresults.txt');
if (fs.existsSync(logFilePath)) {
    fs.unlinkSync(logFilePath);
}
const logStream = fs.createWriteStream(logFilePath, { flags: 'a' });

// Function to log to both console and file
function logToBoth(message, isError = false) {
    const timestampedMessage = `[${moment().format('HH:mm:ss')}] ${message}`;
    if (isError) {
        originalConsoleError(timestampedMessage);  // Log to console as an error using originalConsoleError
    } else {
        originalConsoleLog(timestampedMessage);  // Log to console normally using originalConsoleLog
    }
    logStream.write(timestampedMessage + '\n');  // Write to file
}

// Overwrite console.log and console.error to log to both
const originalConsoleLog = console.log;
console.log = function(message) {
    logToBoth(message);
};

const originalConsoleError = console.error;
console.error = function(message) {
    logToBoth(message, true);
};

let config;
let cookie;
let token;

let success = 0;
let failed = 0;

if (!fs.existsSync(__dirname + "/config.json")) {
    let obj = {
        "location": `${process.env.USERPROFILE}\\Downloads`,
        "dwURL" : "https://vamokuhlekhumalo.docuware.cloud/DocuWare/Platform",
        "dwUsername": "vamokuhle.khumalo.admin",
        "dwPassword": "Mtungwa@Ricoh2023!",
        "grant_type": "password",
        "client_id": "docuware.platform.net.client",
        "scope": "docuware.platform"
    };
    config = obj;
    fs.writeFile(__dirname + "/config.json", JSON.stringify(obj), (err) => {
        if (err) throw err;
        startInterval(config); // Call startInterval only after writing the file
    });
} else {
    fsa.readFile(__dirname + "/config.json", 'utf8')
        .then((data) => {
            config = JSON.parse(data);
            return startInterval(config); // Return the promise from startInterval
        })
        .catch((err) => {
            console.error('Error reading config file:', err);
        });
}

async function startInterval(config) {

    // Fetch the Identity Service Info
    identityResponse = await fetch(`${config.dwURL}/Home/IdentityServiceInfo`, {
        method: "GET",
        credentials: 'same-origin',
        headers: {
            "Accept": "application/json"
        }
    });

    if (!identityResponse.ok) throw new Error('Network response was not ok');
    const identityData = await identityResponse.json();

    const identityServiceUrl = identityData.IdentityServiceUrl + "/.well-known/openid-configuration";

    // Fetch the OAuth2 token endpoint URL
    const openIdConfigResponse = await fetch(identityServiceUrl, {
        method: "GET",
        headers: {
            "Accept": "application/json"
        }
    });


    if (!openIdConfigResponse.ok) throw new Error('OpenID configuration response was not ok');
    const openIdConfigData = await openIdConfigResponse.json();
    const tokenEndpoint = openIdConfigData.token_endpoint;

    // Fetch the OAuth2 Token
    const tokenResponse = await fetch(tokenEndpoint, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Accept": "application/json"
        },
        body: `grant_type=password&username=${config.dwUsername}&password=${config.dwPassword}&client_id=${config.client_id}&scope=${config.scope}`
    });

    if (!tokenResponse.ok) throw new Error('Token response was not ok');
    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Save access token to config.json
    config.accessToken = accessToken;
   fs.writeFile(__dirname + "/config.json", JSON.stringify(config, null, 2), (err) => {
        if (err) throw err;
        console.log('Access token saved to config.json');
    });


        // Helper function to fetch data
        async function fetchData(url, config) {
            const response = await fetch(url, config);
            if (!response.ok) throw new Error(`Failed to fetch data from ${url}`);
            return response.json();
        }

        // Delete existing file if it exists
        const filePath = __dirname + "/Groups and Users.txt";
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

        // Main function to process groups, users, and roles
        async function processGroups() {
            
            try{

                //get user(s)
                const getUser = await fetchData(`${config.dwURL}/Organization/Users?` , {
                    method: "GET",
                        headers: {
                            "Authorization": `Bearer ${config.accessToken}`,
                            "Accept": "application/json"
                        }
                });

                const users = getUser.User;

                //loop through each user
                for(const user of users){
                    const userName = user.Name;
                    const userId = user.Id;

                    //write user detail to file
                    await fs.promises.appendFile(filePath , `------------------User-------------------\n${userName}\n----------------Group(s)-----------------\n`);
                    console.log(`user ${userName} written successfully`)

                    //get the groups which the user belong to
                    const getGroup = await fetchData(`${config.dwURL}/Organization/UserGroups?UserId=${userId}`,{
                        method : "GET",
                        headers : {
                            Authorization : `Bearer ${config.accessToken}`,
                            Accept : "application/json"
                        }
                    });

                    const groups = getGroup.Item;

                    //loop through the group(s)
                    for(const group of groups){
                        const groupName = group.Name;

                        await fs.promises.appendFile(filePath,`${groupName}\n`)
                        console.log(`Group "${groupName}" for user ${userName} written successfully`)
                    }
                    await fs.promises.appendFile(filePath,`------------------Role(s)----------------\n`)

                    const getRole = await fetchData(`${config.dwURL}/Organization/UserRoles?UserId=${userId}`, {
                        method : "GET",
                        headers : {
                            Accept : "application/json",
                            Authorization : `Bearer ${config.accessToken}`
                        }
                    });

                    const roles = getRole.Item;

                        // Write each role of the user
                        for (const role of roles) {
                            await fs.promises.appendFile(filePath, `${role.Name}\n`);
                            console.log(`Role ${role.Name} for user ${userName} written successfully`);
                        }

                        await fs.promises.appendFile(filePath,`-----------------------------------------\n`)
                }
            }catch(err){
                console.log(`error ${err}`)
            }
        }

        // Run the main function
        processGroups();
   
}