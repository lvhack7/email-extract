const Imap = require('imap');
const simpleParser = require('mailparser').simpleParser;

// IMAP server configuration
const imapConfig = {
  user: process.env.EMAIL,
  password: process.env.PASSWORD,
  host: 'imap.gmail.com',
  port: 993,
  tls: true,
  tlsOptions: { rejectUnauthorized: false }
};

// Create an IMAP instance
const imap = new Imap(imapConfig);

// Function to open the mailbox and listen for new messages
function openInbox(cb) {
  imap.openBox('INBOX', true, cb);
}

async function processAttachments(parts) {
    for (const part of parts) {
        if (part.type === 'attachment') {
          if (part.filename) {
            // Convert the attachment content to base64
            const base64Content = Buffer.from(part.content).toString('base64');
    
            // Example API endpoint to send attachments
            const apiUrl = 'https://example.com/upload';
    
            try {
              // Send the attachment to the API using Axios
              const response = await axios.post(apiUrl, {
                filename: part.filename,
                content: base64Content
              });
    
              console.log(`Attachment ${part.filename} sent successfully. Response:`, response.data);
            } catch (error) {
              console.error(`Error sending attachment ${part.filename}:`, error.response ? error.response.data : error.message);
            }
          }
        }
    }
}

// Start the script
imap.once('ready', () => {
  openInbox((err, box) => {
    if (err) {
      console.error('Error opening mailbox:', err);
      return;
    }
    
    console.log('Listening for new emails...');

    // Listen for new emails
    imap.on('mail', (data) => {
        console.log(data)
        const currentDate = new Date().toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        console.log("DATE: ", currentDate)
        imap.search(['UNSEEN', ['SINCE', currentDate]], (err, results) => {
            if (err) {
                console.error('Error searching for new emails:', err);
                return;
            }
            console.log(results)
            let lastElement = results[results.length - 1];
            var f = imap.fetch([lastElement], { bodies: '' });
            f.on('message', function(msg, seqno) {
                console.log('Message #%d', seqno);
                var prefix = '(#' + seqno + ') ';
                msg.on('body', function(stream, info) {
                    simpleParser(stream, async (err, parsed) => {
                        if (err) {
                          console.error('Error parsing message:', err);
                          return;
                        }
                        
                        // console.log('Subject:', parsed.subject);
                        // console.log('From:', parsed.from.text);

                        if (parsed.attachments) {
                            await processAttachments(parsed.attachments);
                        }
                    });
                });

                msg.once('end', function() {
                    console.log(prefix + 'Finished');
                });
            });
            f.once('error', function(err) {
                console.log('Fetch error: ' + err);
            });
            f.once('end', function() {
                console.log('Done fetching all messages!');
                //imap.end();
            });
        });
    });
  });
});

imap.once('end', () => {
  console.log('Connection ended');
});

imap.connect();
