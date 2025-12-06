
function autoForwardToInvoiceApp() {
    // CONFIGURATION
    // Replace this with your actual Vercel URL after deployment
    var API_URL = "https://invoice-kohl-five.vercel.app/api/support/incoming";
    var TARGET_LABEL = "InvoiceAppProcessed"; // Label to apply to processed emails

    // 1. Search for unread emails (you can refine this search query)
    // Example: "is:unread subject:(refund OR rückerstattung)" or just "is:unread"
    var threads = GmailApp.search("is:unread -label:" + TARGET_LABEL);

    for (var i = 0; i < threads.length; i++) {
        var messages = threads[i].getMessages();

        // Process only the last message in the thread (newest)
        var message = messages[messages.length - 1];

        if (message.isUnread()) {
            var payload = {
                "sender": message.getFrom(),
                "subject": message.getSubject(),
                "content": message.getPlainBody(),
                "date": message.getDate().toString()
            };

            var options = {
                "method": "post",
                "contentType": "application/json",
                "payload": JSON.stringify(payload)
            };

            try {
                UrlFetchApp.fetch(API_URL, options);
                console.log("Forwarded email: " + message.getSubject());

                // Mark as processed by adding a label (create label if not exists)
                var label = GmailApp.getUserLabelByName(TARGET_LABEL);
                if (!label) {
                    label = GmailApp.createLabel(TARGET_LABEL);
                }
                threads[i].addLabel(label);

                // Optional: Mark as read
                // message.markRead();

            } catch (e) {
                console.error("Error forwarding email: " + e.toString());
            }
        }
    }
}
