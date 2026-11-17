# UPI test results (DS-6)

Test page: `/upi-test.html`, opened from a WhatsApp message. Amount ₹1 to your own UPI ID.

| App | Phone | Button opens app? | Amount filled? | Payment went through? | QR works? | Copy-ID works? | Warning or limit shown |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Google Pay | Android | | | | | | |
| Google Pay | iPhone | | | | | | |
| PhonePe | Android | | | | | | |
| PhonePe | iPhone | | | | | | |
| Paytm | Android | | | | | | |
| Paytm | iPhone | | | | | | |

Also note: does the button work when the link is opened inside WhatsApp's own browser, and when opened in Chrome or Safari?

## Conclusion

Per-app results were not recorded. Decision (18 Nov 2026): keep the default layout in `docs/decisions.md`. UPI is optional for guests, with button, QR and copy-ID all offered so a failure in one still leaves the others.
