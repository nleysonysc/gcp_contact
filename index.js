const { google } = require('googleapis');
const key = require('./config/key.json');

exports.reply = async (req, res) => {
  var client = await getAuthClient();
  var spreadsheetId = process.env.SPREADSHEETID;
  var range = 'A1';
  var row = ['A Cloud Function was here'];
  client.authorize((err, tokens) => {
    if (err) {
        throw (err);
    }
    appendSheetRow(client, spreadsheetId, range, row);
  })
    // res.status(200).type('text/plain').end('OK');
};

async function appendSheetRow(client, spreadsheetId, range, row) {
    const spreadsheetApp = google.sheets({
        version: 'v4',
        auth: client
    });
    

    try {
        let result = await spreadsheetApp.spreadsheets.values.append({
            spreadsheetId: spreadsheetId,
            range: range,
            valueInputOption: 'RAW',
            requestBody: {
                values: [
                    ['Justin', '1/1/2001', 'Website'],
                    ['Node.js', '2018-03-14', 'Fun'],
                ],
            }
          
        });
        console.log('Updated sheet: ' + result.data.updates.updatedRange);
    }
    catch (err) {
        throw err;
    }
}

async function getAuthClient() {
    return await new google.auth.JWT(key.client_email, null, key.private_key, [
      'https://www.googleapis.com/auth/spreadsheets'
    ]);
}

exports.readGoogleSheet = async (event, context) => {
    const client = await getAuthClient()
  
    const readSheet = async auth => {
      const spreadsheetApp = google.sheets({
        version: 'v4',
        auth
      });
  
      const options = {
        spreadsheetId: process.env.SPREADSHEETID,
        range: 'sheet1!A:C'
      };
      const { data } = await spreadsheetApp.spreadsheets.values.get(options);
      console.log(data.values);
    };
  
    client.authorize((err, tokens) => {
      if (err) {
        console.error(err);
        return;
      }
      readSheet(client);
    });
  };

exports.reply();