import type {
  LegalContentKey,
  LegalDocumentContent,
} from './legal-content.models';

/**
 * English versions of the five legal documents.
 *
 * The platform is advertised in both Spanish and English, and article 16 of the
 * LFPDPPP requires the privacy notice to be available in a language the holder
 * understands. Leaving the English half untranslated would mean half the
 * audience gets no notice at all — which is not a lesser version of the same
 * document, it is no document.
 *
 * Kept structurally identical to the Spanish file: same section ids, same
 * order, same tables. `legal-content.spec.ts` enforces that.
 */

/** Privacy notice (integral and simplified forms, arts. 15 and 16 LFPDPPP). */
const privacy: LegalDocumentContent = {
  intro:
    'This notice explains what personal data we collect, why, who we share it ' +
    'with, and how you can exercise your rights. When we collect data ' +
    'electronically we also give you the simplified notice required by article ' +
    '16(II) before we ask for it.',
  summary: [
    'We process your data to provide the service: your account, your profile, ' +
      'your applications and, if you are a company, your vacancies.',
    'Your most sensitive data —identity document, date of birth, tax ID — is ' +
      'processed with express, not tacit, consent.',
    'We show your information to companies that subscribe to us only when you ' +
      'authorise it by making your profile visible.',
    'We do not sell your data, do not use it for third-party advertising and ' +
      'do not send it outside Mexico without an express legal basis.',
    'You can exercise your ARCO rights and withdraw consent at any time, ' +
      'without explanation and without penalty.',
  ],
  sections: [
    {
      id: 'responsable',
      heading: '1. Identity and address of the controller (art. 15(I))',
      paragraphs: [
        'Impulso Jobs is a digital platform connecting job seekers with ' +
          'companies offering vacancies. The controller of your personal data is:',
      ],
      table: {
        head: ['Detail', 'Value'],
        rows: [
          ['Legal name', '{{LEGAL_NAME}}'],
          ['Trade name', 'Impulso Jobs'],
          ['RFC (tax ID)', '{{RFC}}'],
          ['Registered address', '{{FISCAL_ADDRESS}}'],
          ['Operating address', '{{OPERATING_ADDRESS}}'],
          ['Data protection contact', '{{DPO_EMAIL}}'],
          ['Phone for enquiries', '{{CONSUMER_PHONE}}'],
          ['Email for complaints', '{{CONSUMER_EMAIL}}'],
        ],
      },
      callout:
        'The values in braces are replaced by the controller before ' +
        'publication. If you can see them, the notice is incomplete and does ' +
        'not satisfy article 15(I).',
    },
    {
      id: 'datos',
      heading: '2. Personal data we process (art. 15(II))',
      paragraphs: [
        'We do not process sensitive personal data within the meaning of article ' +
          '2(VI) —health, ethnic origin, religious beliefs, political opinions ' +
          'or sexual preference— because the service does not need it.',
      ],
      bullets: [
        'Identification and contact: first and last name, email, phone number ' +
          'and phone country code.',
        'Official identification: identity document, CURP, issuing country, ' +
          'date of birth and country of residence. These are what the law ' +
          'requires to open an account and to let a company verify identity.',
        'Tax data, company accounts only: legal name, RFC, tax regime, CFDI use, ' +
          'postal code and address.',
        'Professional profile: title, summary, work experience, education, ' +
          'languages, skills and CV in PDF.',
        'Content you choose to upload: profile photo, company logo and vacancy ' +
          'images.',
        'Service usage: published vacancies, applications, screening answers, ' +
          'saved vacancies, and the contact details you give us in the contact ' +
          'form or newsletter.',
        'Technical data: IP address, user agent, legal document acceptance ' +
          'records and audit log.',
        'Payment data: strictly what is needed to invoice. We never store full ' +
          'card numbers.',
      ],
      callout:
        'A photograph is a separate case: besides being personal data, using it ' +
        'is an assignment of image rights with its own document and its own ' +
        'checkbox, because the law requires that consent to be express and ' +
        'separate.',
    },
    {
      id: 'finalidades',
      heading: '3. Purposes of processing (art. 15(III))',
      paragraphs: [
        'The right-hand column shows which purposes rest on the contractual ' +
          'relationship with you and which require your consent. Article 15(III) ' +
          'requires them to be distinguished.',
      ],
      table: {
        head: ['Purpose', 'Basis'],
        rows: [
          ['Create and maintain your account and sign you in', 'Contract'],
          ['Publish your profile when you enable it', 'Consent'],
          ['Show your data in the talent bank', 'Express consent'],
          ['Manage your applications and your company vacancies', 'Contract'],
          ['Charge, invoice and administer your plan or promotion', 'Contract'],
          ['Send the newsletter and commercial messages', 'Consent — you may refuse without losing the service'],
          ['Keep evidence of what you accepted and when', 'Legal obligation'],
          ['Handle ARCO requests and complaints', 'Legal obligation'],
          ['Maintain security and keep the audit trail', 'Legal obligation'],
          ['Comply with competent authorities', 'Legal order'],
        ],
      },
      callout:
        'We do not use your data for advertising profiles, nor to decide which ' +
        'offers you see through automated evaluation. Article 26(II) of the ' +
        'LFPDPPP gives the right to object to automated processing producing ' +
        'legal effects; the cleanest way to honour it is not to do it.',
    },
    {
      id: 'transferencias',
      heading: '4. Transfers (art. 15(V) and art. 35)',
      paragraphs: [
        'We neither sell nor rent your personal data. There are only two cases ' +
          'in which it travels beyond this platform:',
      ],
      bullets: [
        'To the company that published the vacancy, when you apply. Article ' +
          '36(VII) allows transfers necessary to maintain a legal relationship ' +
          'between holder and controller. Even so, we require your express ' +
          'consent when you make your profile visible, so the decision is yours ' +
          'and is recorded.',
        'To suppliers who run the service on our behalf, in their role as ' +
          'processor: payment gateway, email service and hosting. The processor ' +
          'receives this notice and assumes the same obligations we do.',
      ],
      callout:
        'Transfers outside Mexico would require their own legal basis under ' +
          'article 36 and an express clause in this notice. As of this version ' +
          'there are none.',
    },
    {
      id: 'cookies',
      heading: '5. Cookies and automatic data collection',
      paragraphs: [
        'We use technologies that obtain information automatically the moment ' +
          'you enter the site. Article 14, third paragraph, of the LFPDPPP ' +
          'Regulations requires telling you at that moment and explaining how ' +
          'to disable them.',
      ],
      bullets: [
        'Every request to our servers carries your IP address and user agent.',
        'We store your language preference and your cookie answer in our own ' +
          'first-party cookies, which you can delete from your browser.',
        'Google Fonts, Google Identity Services and OpenStreetMap are ' +
          'third-party resources and load only if you consent. Without consent ' +
          'the site works exactly the same, with system fonts and no map.',
      ],
      callout:
        'The cookie-by-cookie description is in the Cookie Policy, where you ' +
        'can change your decision at any time.',
    },
    {
      id: 'seguridad',
      heading: '6. Security measures',
      paragraphs: [
        'We maintain administrative, technical and physical measures against ' +
          'damage, loss, alteration, destruction or unauthorised access, as ' +
          'article 18 requires. Specifically:',
      ],
      bullets: [
        'Passwords hashed with bcrypt, never in plain text.',
        'Sessions with short access tokens and long refresh tokens, revocable ' +
          'and backed by a revocation list.',
        'Role and permission checks on every endpoint; authorisation is never ' +
          'decided in the browser.',
        'Ownership checks on every resource: a company sees only its vacancies ' +
          'and a candidate only their own data.',
        'An audit trail of sensitive operations.',
        'Backups and encryption in transit.',
      ],
      callout:
        'If a breach significantly affects your patrimonial or moral rights, ' +
        'we will tell you immediately so you can take measures, as article 19 ' +
        'requires.',
    },
    {
      id: 'conservacion',
      heading: '7. Retention',
      bullets: [
        'Account and profile: while the account is active, and after closure for ' +
          'a defined retention period, blocked and unusable.',
        'Business records, contracts and payment receipts: ten years, under ' +
          'articles 38, 46 and 49 of the Commercial Code.',
        'Data tied to breach of contractual obligations: seventy-two months, ' +
          'under article 10, third paragraph, of the LFPDPPP.',
        'Legal document acceptance records: kept even after the account is ' +
          'deleted, because they are the evidence of what was accepted.',
        'CV and files you uploaded: deleted with your account.',
      ],
      callout:
        'When data is no longer needed for the purposes in this notice, it is ' +
        'suppressed after prior blocking, as article 10 requires.',
    },
    {
      id: 'arco',
      heading: '8. Your ARCO rights (art. 15(IV) and arts. 21 to 34)',
      table: {
        head: ['Right', 'How to exercise it yourself'],
        rows: [
          ['Access', 'Download all your data as JSON from «My account»'],
          ['Rectification', 'Edit your profile or your company details'],
          ['Cancellation', 'Close your account from «My account»; effective immediately'],
          ['Objection', 'Change your profile visibility in «Settings»'],
        ],
      },
      paragraphs: [
        'If you prefer the written procedure, write to the data protection ' +
          'address in section 1 including:',
      ],
      steps: [
        'Your name and an address or means of receiving notices.',
        'Proof of your identity, or of your representative’s identity and ' +
          'authority.',
        'A clear description of the data concerned and which right you are ' +
          'exercising.',
        'Any document that helps locate the data.',
      ],
      callout:
        'We reply within twenty calendar days of receiving the request and ' +
        'implement it within the following fifteen days (art. 31). We may ' +
        'extend that period once by an equal term if we justify it. Exercising ' +
        'the right is free; we only charge reproduction or shipping costs, and ' +
        'if you provide the medium, delivery is free (art. 34).',
    },
    {
      id: 'revocacion',
      heading: '9. Withdrawing consent',
      paragraphs: [
        'You may withdraw consent at any time. Withdrawal has no retroactive ' +
          'effect: what was done while you consented remains valid.',
      ],
      bullets: [
        'From «My account» you can withdraw each consent and see the full ' +
          'history of what you accepted, with date and version.',
        'Writing to the data protection address has the same effect.',
      ],
      callout:
        'Withdrawing the Terms or the Notice does not cancel your account or ' +
        'void a current subscription: it closes the door to future processing. ' +
        'To actually cancel, use account deletion.',
    },
    {
      id: 'menores',
      heading: '10. Minors',
      paragraphs: [
        'The service is intended for people over 18. We do not knowingly ' +
          'collect data from minors. If you believe an account belongs to a ' +
          'minor, write to us and we will delete it.',
      ],
    },
    {
      id: 'terceros',
      heading: '11. Third-party data',
      paragraphs: [
        'If your profile, a vacancy or your CV contains another person’s data, ' +
          'you are asking us to publish it. Uploading an image of someone else ' +
          'means you warrant you have their authorisation and you accept ' +
          'responsibility.',
      ],
    },
    {
      id: 'cambios',
      heading: '12. Changes to this notice (art. 15(VI))',
      paragraphs: [
        'Every material change is published here with a new version, an ' +
          'effective date and access to previous versions. We do not change a ' +
          'notice retroactively: what you accepted is still enforceable under ' +
          'the version you accepted.',
      ],
      callout:
        'Procedure: a minor change is announced on this page; a material one ' +
          'is emailed to your account address and, on your next sign-in, we ' +
          'ask you to accept it again.',
    },
  ],
  closing:
    'If you believe your right to data protection has been breached, you may ' +
    'go to the Secretaría Anticorrupción y Buen Gobierno. You have fifteen ' +
    'working days from the date we communicate our answer, and you may also ' +
    'act once the twenty-day deadline in article 31 has passed with no reply.',
};

/** Terms and conditions, drafted as a contract of adhesion (art. 85 LFPC). */
const terms: LegalDocumentContent = {
  intro:
    'These terms govern the use of Impulso Jobs. By creating an account or ' +
    'buying a plan you accept this document in its current version. If you do ' +
      'not agree, do not use the service.',
  summary: [
    'Impulso Jobs is an intermediary: we connect vacancies with candidates. We ' +
      'are not an employer and we cannot guarantee that a hire happens.',
    'The company publishes, decides and hires. The candidate decides what to ' +
      'apply to.',
    'The enforceable obligations on acceptance are the platform’s and those of ' +
      'the company buying a plan; the candidate undertakes lawful use.',
    'Plans are prepaid, include VAT and are digital: the period starts when ' +
      'payment is confirmed.',
    'You may cancel without penalty. Consumed periods are not refunded.',
  ],
  sections: [
    {
      id: 'alcance',
      heading: '1. What Impulso Jobs is',
      paragraphs: [
        'Impulso Jobs is a digital platform that lets companies publish ' +
          'vacancies and candidates search and apply. The service consists of ' +
          'publishing information and facilitating communication between the ' +
          'parties.',
      ],
      callout:
        'Under article 12, second paragraph, of the Federal Labour Law, ' +
        'employment agencies or intermediaries involved in hiring are not ' +
        'employers: that role belongs to whoever benefits from the service. ' +
        'Impulso Jobs is not an employer, has no labour relationship with ' +
        'candidates and is not liable for the labour obligations of the ' +
        'companies that use the platform.',
    },
    {
      id: 'cuentas',
      heading: '2. Accounts and requirements',
      bullets: [
        'One account per person; for companies, one per authorised team member.',
        'The data you register must be accurate and current. We verify the ' +
          'email and, for candidates, documentary identity.',
        'You are responsible for keeping your password confidential and for all ' +
          'activity on your account.',
        'Notify us immediately of any unauthorised use.',
        'We may suspend accounts with false data, documents belonging to ' +
          'others, mass scraping, or requests that compromise the service.',
      ],
    },
    {
      id: 'empresa',
      heading: '3. Company obligations',
      bullets: [
        'Publish truthful vacancies: roles, salary where applicable, ' +
          'conditions and location must be real.',
        'No discrimination based on origin, gender, age, sexual orientation, ' +
          'disability, religion or any other ground.',
        'Comply with data-protection and employment law when handling the ' +
          'candidates who apply to your vacancies.',
        'Treat the candidate data you receive with the same care as we do and ' +
          'not repurpose it.',
        'Warrant that the image you upload for your company is yours or licensed.',
      ],
      callout:
        'A company publishing a false or discriminatory vacancy may be ' +
        'suspended without prior notice.',
    },
    {
      id: 'candidato',
      heading: '4. Candidate obligations',
      bullets: [
        'Your profile information must be truthful; a profile with false data ' +
          'may be removed.',
        'Do not use the service for spam, unsolicited bulk offers, or to copy ' +
          'and republish company content.',
        'The CV you upload must be yours. If it contains third-party data, you ' +
          'warrant you have their authorisation.',
        'You understand that applying creates no employment relationship and no ' +
          'right to compensation.',
      ],
    },
    {
      id: 'planes',
      heading: '5. Plans, prices and billing',
      paragraphs: [
        'Plans are offered on annual terms or as a vacancy promotion, at the ' +
          'prices and benefits shown on the plans page at the time of purchase.',
      ],
      bullets: [
        'All prices display VAT broken down and the total payable, as required ' +
          'by article 7 BIS of the Federal Consumer Protection Law.',
        'Payment is made with the methods available at the time of purchase; ' +
          'third-party payment methods are responsible for their own processing.',
        'The contracted period begins when payment is confirmed, not when it is ' +
          'requested.',
        'We issue a digital tax receipt for every charge.',
      ],
      callout:
        'Invoices are issued once payment is identified. For cash or transfer ' +
          'methods such as an OXXO voucher, the receipt may take until payment ' +
          'is applied.',
    },
    {
      id: 'renovacion',
      heading: '6. Renewal and cancellation (art. 76 Bis(VIII) and (IX), LFPC)',
      paragraphs: [
        'Annual subscriptions renew automatically. This is what we do to make ' +
          'that lawful and fair:',
      ],
      steps: [
        'Consent to recurring charges is requested expressly and informed at ' +
          'the moment of contracting, through an unchecked box.',
        'We email you at least five calendar days before each renewal charge.',
        'You can cancel without penalty from your account, in two steps, with ' +
          'no call and no email required.',
        'If you cancel within the five days before the charge, the renewal is ' +
          'not processed.',
      ],
      callout:
        'The law obliges us to offer immediate cancellation without penalty. We ' +
        'cannot charge you a penalty for cancelling, even on a renewed contract.',
    },
    {
      id: 'reembolsos',
      heading: '7. Refunds',
      paragraphs: [
        'Full detail is in the Refund Policy, which forms part of these terms. In ' +
          'short: the services are digital and start the moment payment is ' +
          'confirmed, so consumed time is not refunded; unused time is.',
      ],
      callout:
        'If a charge was made in error, duplicated, or without your ' +
          'authorisation, it is refunded in full regardless of the period.',
    },
    {
      id: 'contenido',
      heading: '8. Content published by users',
      paragraphs: [
        'Companies publish vacancies; candidates publish profiles and CVs. That ' +
          'content belongs to them.',
      ],
      bullets: [
        'You licence us to display it in the service, solely so the service ' +
          'works.',
        'You warrant you hold the rights to what you upload: your company logo, ' +
          'your vacancy images and any file.',
        'Photographs of people have their own rules: see the Image Rights ' +
          'Assignment.',
      ],
    },
    {
      id: 'propiedad',
      heading: '9. Intellectual property',
      bullets: [
        'The brand, design, software and the site’s own content belong to Impulso ' +
          'Jobs or its licensors.',
        'You grant us the right to use your logo inside the platform while your ' +
          'account is active.',
        'Third-party photographs, texts and marks appearing in the service ' +
          'belong to their owners.',
      ],
    },
    {
      id: 'aviso-contenido',
      heading: '10. Notice and counter-notice for protected content',
      paragraphs: [
        'If you believe an image or text published here infringes your ' +
          'copyright, notify us. We follow the regime of articles 114 Septies ' +
          'and 114 Octies of the Federal Copyright Law.',
      ],
      steps: [
        'Send the notice with your name, the exact URL, the work and your right ' +
          'in it, and an electronic or scanned handwritten signature evidencing ' +
          'ownership.',
        'We do not condition removal on registering the work: a statement under ' +
          'oath of truth is enough.',
        'We remove the material and notify whoever published it.',
        'If they believe the removal was an error, they may file a counter-notice ' +
          'with the same details.',
        'The law penalises bad-faith notices.',
      ],
    },
    {
      id: 'suspension',
      heading: '11. Suspension and termination',
      paragraphs: [
        'You may close your account at any time. We may suspend it temporarily ' +
          'for breach of these terms or for risk to the platform’s security, ' +
          'always telling you where possible.',
      ],
    },
    {
      id: 'garantias',
      heading: '12. Limitation of liability',
      paragraphs: [
        'The service is provided as is. We cannot guarantee it will be ' +
          'uninterrupted or error-free.',
      ],
      callout:
        'Article 90 of the LFPC declares clauses releasing the provider from ' +
        'civil liability null and void. What is accepted here is only that we are ' +
        'not liable for indirect damages; the consumer’s right to claim for ' +
        'breach of the contracted service remains fully intact.',
    },
    {
      id: 'ley',
      heading: '13. Governing law',
      paragraphs: [
        'These terms are governed by applicable Mexican law, in particular the ' +
          'Federal Law on Protection of Personal Data Held by Private Parties, ' +
          'the Federal Consumer Protection Law, the Federal Labour Law and the ' +
          'Federal Copyright Law.',
      ],
      callout:
        'Article 90(VI) of the LFPC declares null any clause requiring a waiver ' +
          'of that law’s protection or submission to foreign courts. Neither is ' +
          'present here, and neither could be.',
    },
    {
      id: 'cambios',
      heading: '14. Changes to these terms',
      paragraphs: [
        'We may amend these terms. Changes are published with their version and ' +
          'effective date, and previous versions stay available.',
      ],
      callout:
        'A material change does not apply retroactively to contracts in force: ' +
        'the version you accepted governs you for that period.',
    },
  ],
  closing:
    'By ticking the boxes you consent expressly to this document. We record ' +
    'that acceptance with its version, date, IP address and browser, and you ' +
    'can see the record any time from «My account».',
};

/** Cookie policy. No Mexican cookie law exists; the LFPDPPP fills the gap. */
const cookies: LegalDocumentContent = {
  intro:
    'This policy explains which technologies we use to gather information about ' +
      'your visit, who controls them, and how to disable them. Before you ' +
      'accept, a banner asks you, and you can refuse everything that is not ' +
      'essential without the site ceasing to work.',
  summary: [
    'We use no advertising or cross-site tracking cookies.',
    'We keep two first-party cookies, for language and for your answer to this ' +
      'banner. They are the only ones set without asking first.',
    'Google Fonts, Google Identity Services and OpenStreetMap load only if you ' +
      'consent.',
    'Refusing all is as easy as accepting: same button, same number of clicks.',
    'You can change your decision whenever you want from this very page.',
  ],
  sections: [
    {
      id: 'que-son',
      heading: '1. What cookies are',
      paragraphs: [
        'A cookie is a small file the site stores in your browser. It lets us ' +
          'remember things between pages —your language, or that you already ' +
          'answered this banner— without having to identify you.',
      ],
      bullets: [
        'Besides cookies, some technologies do the same thing: store ' +
          'information on your device or read it.',
        'Fingerprinting, which rebuilds your identifier from browser ' +
          'characteristics, is one of them.',
      ],
      callout: 'We use no fingerprinting of any kind.',
    },
    {
      id: 'tabla',
      heading: '2. The cookies and resources we use',
      table: {
        head: ['Name', 'Set by', 'Purpose', 'Category'],
        rows: [
          ['ij_lang', 'Impulso Jobs', 'Remember the language. Does not identify you.', 'Essential'],
          ['ij_consent', 'Impulso Jobs', 'Remember your answer to this banner.', 'Essential'],
          [
            'accounts.google.com',
            'Google LLC',
            'Sign in with Google button. Google sets its own cookies on its ' +
              'domain and may see your IP.',
            'Functional — only with consent',
          ],
          [
            'tile.openstreetmap.org',
            'OpenStreetMap',
            'Show the contact map and the vacancy location. Each tile sends ' +
              'your IP to OpenStreetMap.',
            'Functional — only with consent',
          ],
          ['js.stripe.com', 'Stripe Inc.', 'Process payment for plans and promotions.', 'Essential for purchasing'],
        ],
      },
    },
    {
      id: 'consentimiento',
      heading: '3. How we get your consent',
      paragraphs: [
        'On your first visit we show a banner with three routes: accept all, ' +
          'reject all, or view the detail and choose category by category.',
      ],
      bullets: [
        'The essential category cannot be switched off: without language and a ' +
          'stored answer, the site does not work.',
        'The rest start switched off. Nothing is loaded on you before you ' +
          'decide.',
        'Your answer is stored in the ij_consent cookie and, if you have an ' +
          'account, also in our consent register.',
      ],
      callout:
        'Before your answer exists, no third-party technology has loaded. What ' +
        'downloads on that first visit is our own HTML, CSS and images.',
    },
    {
      id: 'desactivar',
      heading: '4. How to disable them',
      steps: [
        'To change your decision: return to this page and press «Change my ' +
          'preferences». The same banner opens.',
        'To delete them at system level: clear site data in your browser ' +
          'settings.',
        'To block third-party cookies: your browser settings can reject them ' +
          'all; the site keeps working with system fonts and no map.',
      ],
      callout:
        'If you block the consent cookie, you will see the banner again on your ' +
          'next visit, because we cannot remember that you already answered.',
    },
    {
      id: 'servidor',
      heading: '5. What the server logs',
      paragraphs: [
        'Regardless of cookies, every request to our servers carries your IP ' +
          'address and user agent. That cannot be switched off and we do not ' +
          'share it: we use it for security, failed-attempt throttling and ' +
          'auditing.',
      ],
    },
    {
      id: 'cambios',
      heading: '6. Changes to this policy',
      paragraphs: [
        'If we add a new technology it appears here before we start using it, ' +
          'and if it requires consent the banner will ask you again.',
      ],
    },
  ],
  closing:
    'You have the right to object to processing your data for purposes other ' +
    'than those of the service (art. 15(IV) LFPDPPP). Refusing optional cookies ' +
    'is that objection, and it costs you nothing functionally.',
};

/** Refund policy, aligned with the real plans and promotions. */
const refund: LegalDocumentContent = {
  intro:
    'This policy explains when we refund, how long it takes and how. It forms ' +
      'part of the Terms and Conditions; where they conflict, this policy ' +
      'prevails.',
  summary: [
    'Plans are digital services that start the moment payment is confirmed.',
    'We refund in full any billing error, duplicate charge, or unauthorised ' +
      'payment.',
    'We refund the unused portion of a cancellation proportionally.',
    'We do not refund the consumed period.',
    'A refund does not cancel the subscription: you must cancel as well to stop ' +
      'being charged.',
  ],
  sections: [
    {
      id: 'principio',
      heading: '1. Principle',
      paragraphs: [
        'Every charge covers a digital service delivered from the moment payment ' +
          'is confirmed: vacancies are live, the talent bank is available and ' +
          'plan benefits are active. Hence the general rule that consumed time ' +
          'is not refunded.',
      ],
      callout:
        'Mexican consumer law imposes no general right of withdrawal for digital ' +
        'services, but it does oblige us to refund effectively when the provider ' +
        'breaches.',
    },
    {
      id: 'devoluciones',
      heading: '2. When we do refund',
      table: {
        head: ['Case', 'What is refunded', 'Deadline'],
        rows: [
          ['Duplicate charge', '100 % of the duplicate', '15 working days from your report'],
          ['Unauthorised charge', '100 %', '15 working days'],
          ['Billing error (amount, method or concept)', 'The difference or 100 %', '15 working days'],
          ['Service unavailable through our fault', 'Proportional to the unavailable time', '15 working days'],
          ['Gateway failure where the bank does not reverse the charge', '100 % once confirmed', '30 calendar days'],
          [
            'Cancellation notified in the 5 days before a renewal charge',
            '100 %, because the renewal was not processed',
            '15 working days',
          ],
        ],
      },
    },
    {
      id: 'proporcional',
      heading: '3. Cancelling a current subscription',
      paragraphs: ['When you cancel:'],
      bullets: [
        'Access to paid features is disabled immediately.',
        'The consumed period is not refunded.',
        'The unconsumed period is refunded proportionally, calculated by days.',
        'Cancellation generates no additional charge.',
      ],
      callout:
        'Article 76 Bis(IX) of the Federal Consumer Protection Law obliges us ' +
        'to offer this immediate cancellation mechanism. We cannot add penalties ' +
        'or conditions.',
    },
    {
      id: 'promociones',
      heading: '4. Vacancy promotions',
      paragraphs: [
        'Promotions highlight a vacancy (featured or high) for a set period. If ' +
          'the vacancy is deleted, hidden or closed before the paid period ends ' +
          'for a reason attributable to the company, the unused time is refunded ' +
          'proportionally. If the vacancy simply reached its expiry date, the ' +
          'period was consumed and there is no refund.',
      ],
    },
    {
      id: 'excepciones',
      heading: '5. When there is no refund',
      bullets: [
        'The contracted period already consumed.',
        'The vacancy expired on its own expiry date.',
        'The account was suspended for breach of the Terms.',
        'Published content was removed for breaking the law or the Terms.',
      ],
    },
    {
      id: 'medio',
      heading: '6. Method and deadline',
      steps: [
        'Email support with the order or subscription identifier and the reason.',
        'We review the case within ten working days. If it is payable, we tell ' +
          'you the exact amount before refunding.',
        'The refund runs through the same method you paid with. Credit-card ' +
          'timelines are set by the issuing bank, not by us.',
        'We issue or amend the corresponding tax receipt.',
      ],
      callout:
        'Refunds are executed within fifteen working days of approval, as this ' +
        'policy commits.',
    },
    {
      id: 'reclamos',
      heading: '7. If you disagree',
      paragraphs: [
        'You may request conciliation before the Mexican Federal Consumer ' +
          'Prosecutor’s Office and go to arbitration, under articles 111 and ' +
          '117 of the Federal Consumer Protection Law. The LFPC applies to legal ' +
          'persons too: article 2(I) defines the consumer as the physical or ' +
          'legal person acquiring as final recipient.',
      ],
    },
  ],
  closing:
    'This policy limits none of the rights the Federal Consumer Protection Law ' +
    'grants you. If in doubt, we would rather you wrote to us before buying.',
};

/**
 * Image rights assignment.
 *
 * Separate document and separate checkbox because consent to use a person's
 * image must be express and separate from consent to process their data. The
 * Federal Copyright Law (articles 87 and 216 Bis) and jurisprudence 1a./J.
 * 22/2022 require it, and this use is commercial.
 */
const imageRights: LegalDocumentContent = {
  intro:
    'If you upload a photograph to your profile, you authorise us to display ' +
    'it. This document explains how far that authorisation goes and what is ' +
    'excluded. Authorising is optional: you can use Impulso Jobs without a ' +
    'photo.',
  summary: [
    'You authorise us to show your photo on the platform, unretouched and not ' +
      'for purposes beyond those described here.',
    'We do not assign away your copyright and do not hand your image to third ' +
      'parties to exploit.',
    'You can withdraw your photo whenever you want, without deleting your ' +
      'account or your application history.',
    'If the photo is not yours, you warrant that you have the owner’s ' +
      'authorisation.',
  ],
  sections: [
    {
      id: 'autorizacion',
      heading: '1. What you authorise',
      bullets: [
        'Displaying your photograph on your candidate profile within Impulso ' +
          'Jobs.',
        'Displaying your photograph, with the rest of your profile, in talent ' +
          'bank results for companies with a paid subscription.',
        'The technical loading of the image on our pages, including thumbnails ' +
          'and reduced copies.',
      ],
    },
    {
      id: 'alcance',
      heading: '2. How long, and where',
      paragraphs: [
        'The authorisation lasts as long as your account is active and continues ' +
          'while your profile is visible. When you withdraw the photo, we stop ' +
          'displaying it.',
      ],
      callout:
        'The authorisation is limited: it does not let us put your face on an ' +
        'advert, sell it, or hand it to a third party to use. If we ever wanted ' +
        'that, we would have to ask you for a new and different permission.',
    },
    {
      id: 'fuera',
      heading: '3. What is excluded',
      bullets: [
        'We do not assign authorship of the image. If it is a photograph and it ' +
          'is yours, copyright stays with you.',
        'We do not use it for advertising outside the platform.',
        'We do not license it to third parties for commercial use.',
        'We do not use it to train AI models.',
      ],
    },
    {
      id: 'terceros',
      heading: '4. If the photo is not yours',
      paragraphs: [
        'If someone else appears in your photo, or if it is an image you do not ' +
          'own, uploading it means you warrant you hold their express ' +
          'authorisation for this use.',
      ],
      callout:
        'This includes profile photos downloaded from social networks. Being ' +
        'public does not mean you may republish them commercially.',
    },
    {
      id: 'empresas',
      heading: '5. Company logos and images',
      paragraphs: [
        'The same standard applies to logos and images uploaded by a company: you ' +
          'warrant they are yours or licensed, and that their use here infringes ' +
          'no third party’s rights.',
      ],
    },
    {
      id: 'retiro',
      heading: '6. How to withdraw your authorisation',
      steps: [
        'Remove the photograph from your profile, or',
        'Email us asking for its removal, quoting your account.',
      ],
      callout:
        'Withdrawing the photo does not delete your account or your ' +
        'applications; it only stops the image being shown. If you also want to ' +
        'close the account, that is the right of cancellation, exercised from ' +
        '«My account».',
    },
    {
      id: 'fundamento',
      heading: '7. Legal basis',
      paragraphs: [
        'This document rests on articles 87 and 216 Bis of the Federal Copyright ' +
          'Law, which require express consent to publish a person’s image for ' +
          'commercial purposes, and on jurisprudence 1a./J. 22/2022 of the ' +
          'Supreme Court of Justice of the Nation, which recognises that such an ' +
          'image can be claimed under civil liability when used without consent.',
      ],
    },
  ],
  closing:
    'We keep a record of this authorisation with the document version, date, IP ' +
    'address and browser. You can see it in «My account».',
};

export const LEGAL_CONTENT_EN: Record<LegalContentKey, LegalDocumentContent> = {
  privacy,
  terms,
  cookies,
  refund,
  imageRights,
};