# Google Calendar sync fix

## Kya hoga
- Calendar sync ke bade raw red error ko hata kar chhota, samajhne layak message dikhayenge.
- Google Calendar API disabled error ko specifically pehchanenge.
- Connect aur sync ka baaki behavior nahi badlega.

## Zaroori Google setting
- OAuth client wale Google Cloud project `936210230681` me **Google Calendar API** enable karni hogi.
- Enable hone ke baad 5–10 minute rukkar app me **Sync now** dabana hoga.

## Technical detail
- Server ka provider error safe, user-friendly code/message me map hoga; poora Google JSON screen par expose nahi hoga.
- Calendar permission `calendar.readonly` hi rahegi; Gmail, Drive, Contacts ya doosra Google data access nahi hoga.
