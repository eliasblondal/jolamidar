# Jólamiðar 5. flokks kvenna · Þróttur

Fjáröflunarsíða þar sem foreldrar og iðkendur panta pakka af jólamiðum sem stelpurnar í 5. flokki teiknuðu. Pakkinn (10 miðar) er pantaður á 400 kr. og seldur á 1.500 kr. Mismunurinn, 1.100 kr., fer í ferðasjóð iðkandans.

## Hvernig þetta virkar

- **Pöntunarsíðan** (`index.html`) er fyrir foreldra og iðkendur og er hýst á GitHub Pages.
- **Kynningarsíðan** (`kynning/index.html`) er fyrir ömmur, afa og aðra kaupendur. Hún sýnir ekkert pöntunarform. Slóðin `kynning/?idkandi=Nafn` birtir nafn iðkandans efst.
- **Pantanir** fara í Google Sheet („Jólamiðar Þróttar – pantanir“) í gegnum Google Apps Script (`apps-script/Code.gs`).
- **Staðan** á vefnum (frestur, pantaðir pakkar, safnað) les samtölur úr töflunni. Nöfn og netföng birtast aldrei á vefnum.
- Kaupandi fær greiðsluupplýsingar strax á skjánum og í tölvupósti.

## Daglegur rekstur (í töflunni)

- **Flipinn „Pantanir“**: ein lína á hverja pöntun. Hakaðu í **Greitt** þegar greiðsla berst og **Afhent** þegar pakkinn er afhentur. Hakaðu í **Hætt við** ef pöntun fellur niður (hún dettur þá út úr samtölunum).
- **Flipinn „Stillingar“**: pöntunarfrestur, verð, reikningsnúmer, kennitala, afhendingartexti og netfang tengiliðs. Breytingar þar birtast á vefnum innan mínútu, án þess að snerta kóðann.
- Til að loka fyrir pantanir: taktu hakið af **Pantanir opnar**.

## Ef kóðanum í Apps Script er breytt

Deploy → Manage deployments → blýantur → Version: *New version* → Deploy. Slóðin helst sú sama.
