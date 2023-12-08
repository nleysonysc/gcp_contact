const functions = require('@google-cloud/functions-framework');
const { google } = require('googleapis');
const key = require('./key.json');

var CONFIG = {
    RECAPTCHA_SECRET_KEY: process.env.RECAPTCHA_SECRET_KEY || '',
    REQUIRED_FIELDS: process.env.REQUIRED_FIELDS || 'name,email,message',
    SUCCESS_MESSAGE: process.env.SUCCESS_MESSAGE || 'Thank you, We have received your message',
    KEY: key
}

async function getAuthClient() {
    return await new google.auth.JWT(CONFIG.KEY.client_email, null, CONFIG.KEY.private_key, [
      'https://www.googleapis.com/auth/spreadsheets',
      "https://www.googleapis.com/auth/gmail.send"
    ]);
}

async function recordResponse(formData, res) {
  var client = await getAuthClient();
  var spreadsheetId = process.env.sid;
  var range = 'A1';
  var row = [formData.name, formData.email, formData.message];
  client.authorize(async (err, tokens) => {
        if (err) {
            throw (err);
        }
        await appendSheetRow(client, spreadsheetId, range, row);
  })
  res.status(200).type('text/plain').end('OK');
  
}

async function appendSheetRow(client, spreadsheetId, range, row) {
    const spreadsheetApp = google.sheets({
        version: 'v4',
        auth: client
    });
    

    try {
        console.log(spreadsheetId)
        let result = await spreadsheetApp.spreadsheets.values.append({
            spreadsheetId: spreadsheetId,
            range: range,
            valueInputOption: 'RAW',
            requestBody: {
                values: [
                    row
                ],
            }
          
        });
        // console.log('Updated sheet: ' + result.data.updates.updatedRange);
    }
    catch (err) {
        throw err;
    }
}


function reCaptcha(formData, res) {

    var verificationUrl = 'https://www.google.com/recaptcha/api/siteverify?';

    verificationUrl += querystring.stringify({
        'secret': CONFIG.RECAPTCHA_SECRET_KEY,
        'response': formData['g-recaptcha-response']
    });

    if (formData['g-recaptcha-response'] === undefined || formData['g-recaptcha-response'] === '' || formData['g-recaptcha-response'] === null) {
        return res.status(200).send(JSON.stringify({
            success: false,
            message: 'Please select captcha'
        }));
    }
    
    request(verificationUrl, function (error, response, body) {

        body = JSON.parse(body);
        
        // Success will be true or false depending upon captcha validation.
        if (body.success !== undefined && !body.success) {
            return res.status(200).send(JSON.stringify({
                success: false,
                message: 'Invalid captcha. Please try again'
            }));
        }
        sendEmail(formData, res);
    });
}

exports.onSubmit = (req, res) => {
    
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST');
    res.set('Access-Control-Allow-Headers', 'Content-Type');

    var formData = req.body;
    var requiredFields = CONFIG.REQUIRED_FIELDS.split(',');
    for (var i = 0; i < requiredFields.length; i++) {
        if(!formData[requiredFields[i].trim()]){
            res.send(JSON.stringify({
                success: false,
                message: `${requiredFields[i].trim()} field is required`
            }));
            res.status(200).end();
            return;
        }
    }
    
    if (CONFIG.RECAPTCHA_SECRET_KEY) {
        reCaptcha(formData, res);
    } else {
        recordResponse(formData, res);
    }
};