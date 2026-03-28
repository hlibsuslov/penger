/* =======================================================================
   PENGER Academy — Per-Guide Quiz Data
   80 bilingual questions (8 guides x 2 levels x 5 questions)
   ======================================================================= */
window.GUIDE_QUIZ_DATA = {

  /* ===================================================================
     SEED ANATOMY
     =================================================================== */
  'seed-anatomy': {
    beginner: [
      {
        sectionId: 'b-what-is',
        sectionTitle: { en: 'What Is a Seed Phrase?', uk: 'Що таке сід-фраза?' },
        question: {
          en: 'What is a seed phrase in cryptocurrency?',
          uk: 'Що таке сід-фраза в криптовалюті?'
        },
        options: {
          en: ['A password for your exchange account', 'A set of words that encodes the master key to all your crypto', 'An encryption key for sending transactions', 'A unique username on the blockchain'],
          uk: ['Пароль для біржового акаунту', 'Набір слів, що кодує майстер-ключ до всієї вашої крипти', 'Ключ шифрування для надсилання транзакцій', 'Унікальне ім\'я користувача в блокчейні']
        },
        correct: 1
      },
      {
        sectionId: 'b-how-chosen',
        sectionTitle: { en: 'How Are the Words Chosen?', uk: 'Як обираються слова?' },
        question: {
          en: 'How many words are in the BIP39 wordlist that seed phrases draw from?',
          uk: 'Скільки слів містить список BIP39, з якого формуються сід-фрази?'
        },
        options: {
          en: ['1024', '2048', '4096', '8192'],
          uk: ['1024', '2048', '4096', '8192']
        },
        correct: 1
      },
      {
        sectionId: 'b-order',
        sectionTitle: { en: 'Why Does Order Matter?', uk: 'Чому порядок важливий?' },
        question: {
          en: 'What happens if you rearrange the words in your seed phrase?',
          uk: 'Що станеться, якщо змінити порядок слів у сід-фразі?'
        },
        options: {
          en: ['Nothing changes — the wallet stays the same', 'You get a completely different wallet', 'The wallet locks for 24 hours', 'Only the first address changes'],
          uk: ['Нічого не зміниться — гаманець залишиться тим самим', 'Ви отримаєте зовсім інший гаманець', 'Гаманець заблокується на 24 години', 'Зміниться лише перша адреса']
        },
        correct: 1
      },
      {
        sectionId: 'b-checksum',
        sectionTitle: { en: 'The Checksum', uk: 'Контрольна сума' },
        question: {
          en: 'What is the purpose of the checksum in a seed phrase?',
          uk: 'Яке призначення контрольної суми в сід-фразі?'
        },
        options: {
          en: ['To encrypt the seed phrase', 'To detect transcription errors', 'To add extra security against hackers', 'To compress the seed to fewer words'],
          uk: ['Шифрування сід-фрази', 'Виявлення помилок при копіюванні', 'Додатковий захист від хакерів', 'Стиснення сіда до меншої кількості слів']
        },
        correct: 1
      },
      {
        sectionId: 'b-storage',
        sectionTitle: { en: 'Storing Your Seed Phrase Safely', uk: 'Безпечне зберігання сід-фрази' },
        question: {
          en: 'Which is the safest way to store a seed phrase for long-term holding?',
          uk: 'Який найбезпечніший спосіб зберігання сід-фрази для довгострокового утримання?'
        },
        options: {
          en: ['Screenshot on your phone', 'Cloud storage with encryption', 'Engraved on a metal plate stored offline', 'Text file on your desktop'],
          uk: ['Скріншот на телефоні', 'Хмарне сховище з шифруванням', 'Гравіювання на металевій пластині, що зберігається офлайн', 'Текстовий файл на робочому столі']
        },
        correct: 2
      }
    ],
    advanced: [
      {
        sectionId: 'a-entropy',
        sectionTitle: { en: 'Entropy Sources and CSPRNG', uk: 'Джерела ентропії та CSPRNG' },
        question: {
          en: 'How many bits of entropy does a 24-word seed phrase encode?',
          uk: 'Скільки біт ентропії кодує сід-фраза з 24 слів?'
        },
        options: {
          en: ['128 bits', '192 bits', '256 bits', '512 bits'],
          uk: ['128 біт', '192 біти', '256 біт', '512 біт']
        },
        correct: 2
      },
      {
        sectionId: 'a-checksum',
        sectionTitle: { en: 'SHA-256 Checksum Mechanism', uk: 'Механізм контрольної суми SHA-256' },
        question: {
          en: 'How many checksum bits does a 256-bit (24-word) seed phrase have?',
          uk: 'Скільки біт контрольної суми має сід-фраза з 256 біт (24 слова)?'
        },
        options: {
          en: ['4 bits', '6 bits', '8 bits', '11 bits'],
          uk: ['4 біти', '6 біт', '8 біт', '11 біт']
        },
        correct: 2
      },
      {
        sectionId: 'a-derivation',
        sectionTitle: { en: 'From Mnemonic to Master Key', uk: 'Від мнемоніки до майстер-ключа' },
        question: {
          en: 'Which function converts a BIP39 mnemonic into a 512-bit seed?',
          uk: 'Яка функція перетворює мнемоніку BIP39 у 512-бітний сід?'
        },
        options: {
          en: ['SHA-256', 'HMAC-SHA512', 'PBKDF2 with 2048 rounds of HMAC-SHA512', 'AES-256-CBC'],
          uk: ['SHA-256', 'HMAC-SHA512', 'PBKDF2 з 2048 раундами HMAC-SHA512', 'AES-256-CBC']
        },
        correct: 2
      },
      {
        sectionId: 'a-wordlist',
        sectionTitle: { en: 'Wordlist Design and Multilingual Support', uk: 'Дизайн словника та мультимовна підтримка' },
        question: {
          en: 'Why are the first 4 letters of each BIP39 word unique?',
          uk: 'Чому перші 4 літери кожного слова BIP39 унікальні?'
        },
        options: {
          en: ['To reduce file size', 'To allow unambiguous identification with minimal characters', 'To make brute-force harder', 'It is a random coincidence of the design'],
          uk: ['Для зменшення розміру файлу', 'Для однозначної ідентифікації з мінімальною кількістю символів', 'Для ускладнення брутфорсу', 'Це випадковий збіг дизайну']
        },
        correct: 1
      },
      {
        sectionId: 'a-attacks',
        sectionTitle: { en: 'Attack Vectors and Entropy Analysis', uk: 'Вектори атак та аналіз ентропії' },
        question: {
          en: 'Why is using a brain wallet (memorized phrase) considered insecure?',
          uk: 'Чому використання brain wallet (запам\'ятованої фрази) вважається небезпечним?'
        },
        options: {
          en: ['It has too many words to remember', 'Human-chosen phrases have far less entropy than random generation', 'Brain wallets are not compatible with BIP39', 'They cannot generate valid Bitcoin addresses'],
          uk: ['Занадто багато слів для запам\'ятовування', 'Обрані людиною фрази мають значно меншу ентропію, ніж випадкова генерація', 'Brain wallet несумісний з BIP39', 'Вони не можуть генерувати валідні Bitcoin-адреси']
        },
        correct: 1
      }
    ]
  },

  /* ===================================================================
     WALLET ANATOMY
     =================================================================== */
  'wallet-anatomy': {
    beginner: [
      {
        sectionId: 'b-what-wallet',
        sectionTitle: { en: 'What Is a Crypto Wallet?', uk: 'Що таке крипто-гаманець?' },
        question: {
          en: 'What does a crypto wallet actually store?',
          uk: 'Що насправді зберігає крипто-гаманець?'
        },
        options: {
          en: ['Your cryptocurrency coins', 'Your private keys', 'Your transaction history', 'Your public blockchain data'],
          uk: ['Ваші криптовалютні монети', 'Ваші приватні ключі', 'Вашу історію транзакцій', 'Ваші публічні дані блокчейну']
        },
        correct: 1
      },
      {
        sectionId: 'b-keys',
        sectionTitle: { en: 'Public Keys vs. Private Keys', uk: 'Публічні та приватні ключі' },
        question: {
          en: 'Which key should you never share with anyone?',
          uk: 'Який ключ ніколи не можна нікому показувати?'
        },
        options: {
          en: ['Public key', 'Private key', 'Both keys', 'Neither — keys are always public'],
          uk: ['Публічний ключ', 'Приватний ключ', 'Обидва ключі', 'Жоден — ключі завжди публічні']
        },
        correct: 1
      },
      {
        sectionId: 'b-addresses',
        sectionTitle: { en: 'Addresses and Receiving Funds', uk: 'Адреси та отримання коштів' },
        question: {
          en: 'What is a cryptocurrency address derived from?',
          uk: 'З чого виводиться криптовалютна адреса?'
        },
        options: {
          en: ['Your email address', 'Your public key', 'Your private key directly', 'The blockchain network'],
          uk: ['Вашої електронної пошти', 'Вашого публічного ключа', 'Безпосередньо з приватного ключа', 'Мережі блокчейну']
        },
        correct: 1
      },
      {
        sectionId: 'b-signing',
        sectionTitle: { en: 'Transaction Signing', uk: 'Підписання транзакцій' },
        question: {
          en: 'What does signing a transaction prove?',
          uk: 'Що доводить підписання транзакції?'
        },
        options: {
          en: ['That the recipient is valid', 'That you control the private key for those funds', 'That the network fee is correct', 'That the transaction is encrypted'],
          uk: ['Що отримувач валідний', 'Що ви контролюете приватний ключ для цих коштів', 'Що мережева комісія правильна', 'Що транзакція зашифрована']
        },
        correct: 1
      },
      {
        sectionId: 'b-hd-wallets',
        sectionTitle: { en: 'HD Wallets', uk: 'HD-гаманці' },
        question: {
          en: 'What is the main advantage of an HD (Hierarchical Deterministic) wallet?',
          uk: 'Яка головна перевага HD (ієрархічно-детермінованого) гаманця?'
        },
        options: {
          en: ['Faster transactions', 'Generate unlimited addresses from a single seed', 'Built-in exchange functionality', 'Automatic price tracking'],
          uk: ['Швидші транзакції', 'Генерація необмеженої кількості адрес з одного сіда', 'Вбудована функція обміну', 'Автоматичне відстеження ціни']
        },
        correct: 1
      }
    ],
    advanced: [
      {
        sectionId: 'a-bip32',
        sectionTitle: { en: 'BIP32 Hierarchical Deterministic Derivation', uk: 'BIP32 ієрархічна детермінована деривація' },
        question: {
          en: 'What does a BIP44 derivation path like m/44\'/0\'/0\'/0/0 define?',
          uk: 'Що визначає шлях деривації BIP44, наприклад m/44\'/0\'/0\'/0/0?'
        },
        options: {
          en: ['The encryption algorithm used', 'The hierarchical structure: purpose / coin / account / change / index', 'The number of confirmations needed', 'The transaction fee level'],
          uk: ['Алгоритм шифрування', 'Ієрархічну структуру: призначення / монета / акаунт / решта / індекс', 'Кількість необхідних підтверджень', 'Рівень комісії транзакції']
        },
        correct: 1
      },
      {
        sectionId: 'a-ecdsa',
        sectionTitle: { en: 'ECDSA and Schnorr Signatures', uk: 'ECDSA та підписи Шнорра' },
        question: {
          en: 'What advantage do Schnorr signatures offer over ECDSA?',
          uk: 'Яку перевагу мають підписи Шнорра порівняно з ECDSA?'
        },
        options: {
          en: ['Larger key sizes', 'Native support for key aggregation and smaller multisig transactions', 'Backwards compatibility with Bitcoin v0.1', 'Faster key generation speed'],
          uk: ['Більші розміри ключів', 'Нативна підтримка агрегації ключів та менші мультипідписні транзакції', 'Зворотна сумісність з Bitcoin v0.1', 'Швидша генерація ключів']
        },
        correct: 1
      },
      {
        sectionId: 'a-xpub',
        sectionTitle: { en: 'Extended Public Keys (xpub)', uk: 'Розширені публічні ключі (xpub)' },
        question: {
          en: 'What risk does sharing your xpub create?',
          uk: 'Який ризик створює розповсюдження вашого xpub?'
        },
        options: {
          en: ['Someone can steal your funds', 'Someone can see all your past and future addresses', 'Your seed phrase is revealed', 'Your wallet becomes locked'],
          uk: ['Хтось може вкрасти ваші кошти', 'Хтось може бачити всі ваші минулі та майбутні адреси', 'Ваша сід-фраза буде розкрита', 'Ваш гаманець буде заблоковано']
        },
        correct: 1
      },
      {
        sectionId: 'a-utxo',
        sectionTitle: { en: 'UTXO Model vs. Account Model', uk: 'Модель UTXO та модель акаунтів' },
        question: {
          en: 'In Bitcoin\'s UTXO model, what is a "change output"?',
          uk: 'У моделі UTXO Bitcoin, що таке "вихід решти"?'
        },
        options: {
          en: ['A fee paid to miners', 'The leftover amount sent back to your own address', 'A failed transaction that needs resending', 'An update to the blockchain state'],
          uk: ['Комісія, сплачена майнерам', 'Залишок суми, надісланий назад на вашу адресу', 'Невдала транзакція, яку потрібно повторити', 'Оновлення стану блокчейну']
        },
        correct: 1
      },
      {
        sectionId: 'a-address-types',
        sectionTitle: { en: 'Address Types and Script Formats', uk: 'Типи адрес та формати скриптів' },
        question: {
          en: 'Which Bitcoin address type starts with "bc1p" and uses Taproot?',
          uk: 'Який тип Bitcoin-адреси починається з "bc1p" та використовує Taproot?'
        },
        options: {
          en: ['P2PKH (Legacy)', 'P2SH (Nested SegWit)', 'P2WPKH (Native SegWit)', 'P2TR (Taproot)'],
          uk: ['P2PKH (Legacy)', 'P2SH (Nested SegWit)', 'P2WPKH (Native SegWit)', 'P2TR (Taproot)']
        },
        correct: 3
      }
    ]
  },

  /* ===================================================================
     SELF-SOVEREIGNTY
     =================================================================== */
  'self-sovereignty': {
    beginner: [
      {
        sectionId: 'b-what-is',
        sectionTitle: { en: 'What Is Self-Sovereignty?', uk: 'Що таке самосуверенітет?' },
        question: {
          en: 'What does self-sovereignty mean in the context of cryptocurrency?',
          uk: 'Що означає самосуверенітет у контексті криптовалюти?'
        },
        options: {
          en: ['Using only decentralized exchanges', 'Having full control over your own private keys and funds', 'Mining your own cryptocurrency', 'Owning a full node'],
          uk: ['Використання лише децентралізованих бірж', 'Повний контроль над власними приватними ключами та коштами', 'Майнінг власної криптовалюти', 'Володіння повною нодою']
        },
        correct: 1
      },
      {
        sectionId: 'b-why-matters',
        sectionTitle: { en: 'Why It Matters', uk: 'Чому це важливо' },
        question: {
          en: 'Why is self-custody considered important for cryptocurrency holders?',
          uk: 'Чому самостійне зберігання вважається важливим для власників криптовалюти?'
        },
        options: {
          en: ['It offers higher interest rates', 'It eliminates counterparty risk — no third party can freeze or lose your funds', 'It makes transactions faster', 'It reduces blockchain fees'],
          uk: ['Пропонує вищі відсоткові ставки', 'Усуває ризик контрагента — жодна третя сторона не може заморозити чи втратити ваші кошти', 'Прискорює транзакції', 'Зменшує комісії блокчейну']
        },
        correct: 1
      },
      {
        sectionId: 'b-custodial-risks',
        sectionTitle: { en: 'The Risks of Custodial Services', uk: 'Ризики кастодіальних сервісів' },
        question: {
          en: 'What is a major risk of keeping crypto on a centralized exchange?',
          uk: 'Який основний ризик зберігання крипти на централізованій біржі?'
        },
        options: {
          en: ['Slower network confirmations', 'The exchange can be hacked, go bankrupt, or freeze your account', 'Higher transaction fees', 'Loss of staking rewards'],
          uk: ['Повільніше підтвердження мережі', 'Біржу можуть зламати, вона може збанкрутувати або заморозити ваш акаунт', 'Вищі комісії за транзакції', 'Втрата нагород за стейкінг']
        },
        correct: 1
      },
      {
        sectionId: 'b-roadmap',
        sectionTitle: { en: 'Your Roadmap to Self-Custody', uk: 'Ваша дорожня карта до самостійного зберігання' },
        question: {
          en: 'What is the first step on the roadmap to self-custody?',
          uk: 'Який перший крок на шляху до самостійного зберігання?'
        },
        options: {
          en: ['Buy a hardware wallet', 'Understand what a seed phrase is and how it works', 'Transfer all funds immediately from exchanges', 'Set up a multisig vault'],
          uk: ['Купити апаратний гаманець', 'Зрозуміти, що таке сід-фраза і як вона працює', 'Негайно перевести всі кошти з бірж', 'Налаштувати мультипідписне сховище']
        },
        correct: 1
      },
      {
        sectionId: 'b-responsibility',
        sectionTitle: { en: 'The Responsibility Trade-Off', uk: 'Компроміс відповідальності' },
        question: {
          en: 'What is the main trade-off of self-custody?',
          uk: 'Який головний компроміс самостійного зберігання?'
        },
        options: {
          en: ['Higher fees for every transaction', 'You bear full responsibility — losing your keys means losing your funds', 'Slower transaction speeds', 'You cannot use decentralized applications'],
          uk: ['Вищі комісії за кожну транзакцію', 'Ви несете повну відповідальність — втрата ключів означає втрату коштів', 'Повільніша швидкість транзакцій', 'Ви не можете використовувати децентралізовані застосунки']
        },
        correct: 1
      }
    ],
    advanced: [
      {
        sectionId: 'a-trust',
        sectionTitle: { en: 'Trust Models and Verification', uk: 'Моделі довіри та верифікація' },
        question: {
          en: 'What does "don\'t trust, verify" mean in practice?',
          uk: 'Що означає "не довіряй, а перевіряй" на практиці?'
        },
        options: {
          en: ['Trust no one online', 'Run your own node to independently validate transactions and rules', 'Verify the identity of every person you transact with', 'Only use verified exchanges'],
          uk: ['Не довіряти нікому в інтернеті', 'Запустити власну ноду для незалежної валідації транзакцій та правил', 'Перевіряти особу кожної людини, з якою здійснюєте транзакцію', 'Використовувати лише верифіковані біржі']
        },
        correct: 1
      },
      {
        sectionId: 'a-node',
        sectionTitle: { en: 'Running Your Own Node', uk: 'Запуск власної ноди' },
        question: {
          en: 'Why is running your own Bitcoin node important for sovereignty?',
          uk: 'Чому запуск власної ноди Bitcoin важливий для суверенітету?'
        },
        options: {
          en: ['It earns mining rewards', 'It lets you verify transactions without trusting any third-party server', 'It speeds up your transactions', 'It reduces transaction fees'],
          uk: ['Це приносить нагороди за майнінг', 'Це дозволяє перевіряти транзакції без довіри до стороннього сервера', 'Це прискорює ваші транзакції', 'Це зменшує комісії за транзакції']
        },
        correct: 1
      },
      {
        sectionId: 'a-privacy',
        sectionTitle: { en: 'Privacy as a Sovereignty Pillar', uk: 'Приватність як стовп суверенітету' },
        question: {
          en: 'Why is privacy considered a fundamental aspect of self-sovereignty?',
          uk: 'Чому приватність вважається фундаментальним аспектом самосуверенітету?'
        },
        options: {
          en: ['It hides illegal activity', 'Without privacy, your financial autonomy can be undermined through surveillance and targeting', 'It makes transactions cheaper', 'It is required by Bitcoin protocol rules'],
          uk: ['Вона приховує незаконну діяльність', 'Без приватності ваша фінансова автономія може бути підірвана через стеження та таргетинг', 'Вона робить транзакції дешевшими', 'Це вимагається правилами протоколу Bitcoin']
        },
        correct: 1
      },
      {
        sectionId: 'a-tracking',
        sectionTitle: { en: 'Fund Tracking and Diversification', uk: 'Відстеження коштів та диверсифікація' },
        question: {
          en: 'What is the benefit of using separate wallets for different purposes?',
          uk: 'Яка перевага використання окремих гаманців для різних цілей?'
        },
        options: {
          en: ['It earns bonus crypto', 'It prevents linking your financial activities and limits exposure if one wallet is compromised', 'It reduces blockchain fees', 'It is required by all hardware wallets'],
          uk: ['Це приносить бонусну крипту', 'Це запобігає пов\'язуванню вашої фінансової діяльності та обмежує ризик при компрометації одного гаманця', 'Це зменшує комісії блокчейну', 'Це вимагається всіма апаратними гаманцями']
        },
        correct: 1
      },
      {
        sectionId: 'a-layers',
        sectionTitle: { en: 'Sovereignty Stack', uk: 'Стек суверенітету' },
        question: {
          en: 'Which layers make up a complete "sovereignty stack"?',
          uk: 'Які рівні складають повний "стек суверенітету"?'
        },
        options: {
          en: ['Hardware, software, and cloud', 'Keys, node, network privacy, and physical security', 'Exchange, wallet, and backup', 'Blockchain, smart contract, and token'],
          uk: ['Апаратне забезпечення, програмне забезпечення та хмара', 'Ключі, нода, мережева приватність та фізична безпека', 'Біржа, гаманець та резервна копія', 'Блокчейн, смарт-контракт та токен']
        },
        correct: 1
      }
    ]
  },

  /* ===================================================================
     WALLET COMPARISON
     =================================================================== */
  'wallet-comparison': {
    beginner: [
      {
        sectionId: 'b-hot-cold',
        sectionTitle: { en: 'Hot Wallets vs. Cold Storage', uk: 'Гарячі гаманці та холодне зберігання' },
        question: {
          en: 'What is the key difference between a hot wallet and cold storage?',
          uk: 'Яка ключова різниця між гарячим гаманцем та холодним зберіганням?'
        },
        options: {
          en: ['Hot wallets are faster at confirming transactions', 'Hot wallets are connected to the internet; cold storage is not', 'Cold storage can only hold Bitcoin', 'Hot wallets have higher fees'],
          uk: ['Гарячі гаманці швидше підтверджують транзакції', 'Гарячі гаманці підключені до інтернету, а холодне зберігання — ні', 'Холодне зберігання може зберігати лише Bitcoin', 'Гарячі гаманці мають вищі комісії']
        },
        correct: 1
      },
      {
        sectionId: 'b-hardware',
        sectionTitle: { en: 'Hardware Wallets', uk: 'Апаратні гаманці' },
        question: {
          en: 'What makes hardware wallets more secure than software wallets?',
          uk: 'Що робить апаратні гаманці безпечнішими за програмні?'
        },
        options: {
          en: ['They use a different blockchain', 'Private keys never leave the device — signing happens on the hardware', 'They have faster processors', 'They connect to special secure networks'],
          uk: ['Вони використовують інший блокчейн', 'Приватні ключі ніколи не залишають пристрій — підписання відбувається на апаратному рівні', 'Вони мають швидші процесори', 'Вони підключаються до спеціальних безпечних мереж']
        },
        correct: 1
      },
      {
        sectionId: 'b-custody',
        sectionTitle: { en: 'Custodial vs. Self-Custodial', uk: 'Кастодіальний та самостійний' },
        question: {
          en: 'In a custodial wallet, who controls the private keys?',
          uk: 'У кастодіальному гаманці хто контролює приватні ключі?'
        },
        options: {
          en: ['You do', 'The wallet manufacturer', 'The service provider (exchange, app)', 'No one — keys are shared'],
          uk: ['Ви', 'Виробник гаманця', 'Постачальник послуг (біржа, застосунок)', 'Ніхто — ключі спільні']
        },
        correct: 2
      },
      {
        sectionId: 'b-choosing',
        sectionTitle: { en: 'Choosing the Right Wallet', uk: 'Вибір правильного гаманця' },
        question: {
          en: 'Which factor is most important when choosing a wallet for large long-term holdings?',
          uk: 'Який фактор найважливіший при виборі гаманця для великих довгострокових вкладень?'
        },
        options: {
          en: ['Number of supported coins', 'Security architecture and key isolation', 'Mobile app design', 'Built-in swap features'],
          uk: ['Кількість підтримуваних монет', 'Архітектура безпеки та ізоляція ключів', 'Дизайн мобільного застосунку', 'Вбудовані функції обміну']
        },
        correct: 1
      },
      {
        sectionId: 'b-hw-checklist',
        sectionTitle: { en: 'Hardware Wallet Checklist', uk: 'Чеклист апаратного гаманця' },
        question: {
          en: 'What should you verify when first receiving a hardware wallet?',
          uk: 'Що потрібно перевірити при першому отриманні апаратного гаманця?'
        },
        options: {
          en: ['That it has a pre-loaded seed phrase for convenience', 'That the packaging is sealed and the device firmware is authentic', 'That the wallet already has a Bitcoin address', 'That a recovery card is pre-filled'],
          uk: ['Що він має попередньо завантажену сід-фразу для зручності', 'Що упаковка запечатана і прошивка пристрою автентична', 'Що гаманець вже має Bitcoin-адресу', 'Що карта відновлення попередньо заповнена']
        },
        correct: 1
      }
    ],
    advanced: [
      {
        sectionId: 'a-multisig',
        sectionTitle: { en: 'Multi-Signature Wallets', uk: 'Мультипідписні гаманці' },
        question: {
          en: 'What does a 2-of-3 multisig wallet require to authorize a transaction?',
          uk: 'Що потрібно для авторизації транзакції в мультипідписному гаманці 2-з-3?'
        },
        options: {
          en: ['All 3 keys', '2 out of 3 keys', '1 key plus a password', 'Any single key'],
          uk: ['Усі 3 ключі', '2 з 3 ключів', '1 ключ плюс пароль', 'Будь-який один ключ']
        },
        correct: 1
      },
      {
        sectionId: 'a-airgap',
        sectionTitle: { en: 'Air-Gapped Signing and PSBTs', uk: 'Ізольоване підписання та PSBT' },
        question: {
          en: 'How does an air-gapped hardware wallet communicate with a computer?',
          uk: 'Як ізольований (air-gapped) апаратний гаманець обмінюється даними з комп\'ютером?'
        },
        options: {
          en: ['Via Bluetooth', 'Via QR codes or microSD card — never through a direct connection', 'Via Wi-Fi in a secure mode', 'Via USB with special encryption'],
          uk: ['Через Bluetooth', 'Через QR-коди або microSD-карту — ніколи через пряме з\'єднання', 'Через Wi-Fi у безпечному режимі', 'Через USB зі спеціальним шифруванням']
        },
        correct: 1
      },
      {
        sectionId: 'a-mpc',
        sectionTitle: { en: 'MPC Wallets and Threshold Signatures', uk: 'MPC-гаманці та порогові підписи' },
        question: {
          en: 'How does MPC (Multi-Party Computation) differ from traditional multisig?',
          uk: 'Чим MPC (багатосторонні обчислення) відрізняється від традиційного мультипідпису?'
        },
        options: {
          en: ['MPC is faster', 'MPC splits key shares so the full key never exists in one place, producing a single standard signature', 'MPC requires more keys', 'MPC only works with Ethereum'],
          uk: ['MPC швидше', 'MPC розділяє частини ключа так, що повний ключ ніколи не існує в одному місці, створюючи один стандартний підпис', 'MPC вимагає більше ключів', 'MPC працює тільки з Ethereum']
        },
        correct: 1
      },
      {
        sectionId: 'a-secure-elements',
        sectionTitle: { en: 'Secure Elements and Firmware Verification', uk: 'Захищені елементи та верифікація прошивки' },
        question: {
          en: 'What is the role of a secure element chip in a hardware wallet?',
          uk: 'Яка роль чіпа захищеного елемента в апаратному гаманці?'
        },
        options: {
          en: ['To speed up transaction processing', 'To protect private keys from physical extraction and side-channel attacks', 'To connect to the blockchain directly', 'To store transaction history locally'],
          uk: ['Прискорення обробки транзакцій', 'Захист приватних ключів від фізичного вилучення та атак побічного каналу', 'Пряме підключення до блокчейну', 'Локальне зберігання історії транзакцій']
        },
        correct: 1
      },
      {
        sectionId: 'a-airgap',
        sectionTitle: { en: 'PSBT Workflow', uk: 'Робочий процес PSBT' },
        question: {
          en: 'What is a PSBT (Partially Signed Bitcoin Transaction)?',
          uk: 'Що таке PSBT (частково підписана Bitcoin-транзакція)?'
        },
        options: {
          en: ['A transaction that was partially confirmed by the network', 'A standardized format for passing unsigned transactions between devices for signing', 'A transaction with reduced fees', 'A transaction sent to multiple recipients'],
          uk: ['Транзакція, частково підтверджена мережею', 'Стандартизований формат для передачі непідписаних транзакцій між пристроями для підписання', 'Транзакція зі зниженими комісіями', 'Транзакція, надіслана кільком отримувачам']
        },
        correct: 1
      }
    ]
  },

  /* ===================================================================
     OPSEC
     =================================================================== */
  'opsec': {
    beginner: [
      {
        sectionId: 'b-what-opsec',
        sectionTitle: { en: 'What Is OpSec?', uk: 'Що таке OpSec?' },
        question: {
          en: 'What is the primary goal of operational security (OpSec) in crypto?',
          uk: 'Яка головна мета операційної безпеки (OpSec) у криптовалюті?'
        },
        options: {
          en: ['Increase transaction speed', 'Minimize attack surface and protect private keys from exposure', 'Maximize portfolio returns', 'Reduce blockchain fees'],
          uk: ['Збільшити швидкість транзакцій', 'Мінімізувати вектори атак та захистити приватні ключі від розголошення', 'Максимізувати прибутковість портфеля', 'Зменшити комісії блокчейну']
        },
        correct: 1
      },
      {
        sectionId: 'b-threats',
        sectionTitle: { en: 'Threat Modeling Basics', uk: 'Основи моделювання загроз' },
        question: {
          en: 'What is a threat model?',
          uk: 'Що таке модель загроз?'
        },
        options: {
          en: ['A list of all possible cryptocurrencies', 'A systematic assessment of who might target you and how', 'A software tool for detecting malware', 'A blockchain analysis technique'],
          uk: ['Список усіх можливих криптовалют', 'Систематична оцінка того, хто може вас атакувати і як', 'Програмний інструмент для виявлення шкідливого ПЗ', 'Техніка аналізу блокчейну']
        },
        correct: 1
      },
      {
        sectionId: 'b-digital',
        sectionTitle: { en: 'Digital Security Habits', uk: 'Цифрові звички безпеки' },
        question: {
          en: 'Which practice is essential for protecting your crypto assets digitally?',
          uk: 'Яка практика є необхідною для цифрового захисту ваших крипто-активів?'
        },
        options: {
          en: ['Using the same password for all crypto accounts', 'Using unique passwords with a hardware 2FA key for critical accounts', 'Sharing your portfolio details on social media', 'Keeping all software auto-update disabled'],
          uk: ['Використання одного пароля для всіх крипто-акаунтів', 'Використання унікальних паролів з апаратним ключем 2FA для критичних акаунтів', 'Публікація деталей портфеля в соціальних мережах', 'Вимкнення автооновлення всього програмного забезпечення']
        },
        correct: 1
      },
      {
        sectionId: 'b-physical',
        sectionTitle: { en: 'Physical Security Fundamentals', uk: 'Основи фізичної безпеки' },
        question: {
          en: 'Why is physical security important for crypto self-custody?',
          uk: 'Чому фізична безпека важлива для самостійного зберігання крипти?'
        },
        options: {
          en: ['Crypto only exists physically', 'Seed phrase backups and hardware wallets can be physically stolen or damaged', 'Physical security is not relevant to crypto', 'It protects against blockchain 51% attacks'],
          uk: ['Крипта існує тільки фізично', 'Резервні копії сід-фраз та апаратні гаманці можуть бути фізично вкрадені або пошкоджені', 'Фізична безпека не стосується крипти', 'Вона захищає від атак 51% на блокчейн']
        },
        correct: 1
      },
      {
        sectionId: 'b-social',
        sectionTitle: { en: 'Social Engineering Defense', uk: 'Захист від соціальної інженерії' },
        question: {
          en: 'What is the most common social engineering attack in crypto?',
          uk: 'Яка найпоширеніша атака соціальної інженерії у криптовалюті?'
        },
        options: {
          en: ['DDoS attacks on the blockchain', 'Phishing — fake websites or messages that trick you into revealing keys or signing malicious transactions', 'Mining pool attacks', 'Smart contract exploits'],
          uk: ['DDoS-атаки на блокчейн', 'Фішинг — підроблені сайти або повідомлення, що змушують вас розкрити ключі або підписати шкідливі транзакції', 'Атаки на майнінг-пули', 'Експлойти смарт-контрактів']
        },
        correct: 1
      }
    ],
    advanced: [
      {
        sectionId: 'a-footprint',
        sectionTitle: { en: 'Digital Footprint Minimization', uk: 'Мінімізація цифрового сліду' },
        question: {
          en: 'Which practice helps minimize your digital footprint when using crypto?',
          uk: 'Яка практика допомагає мінімізувати цифровий слід при використанні крипти?'
        },
        options: {
          en: ['Using your real name on all platforms', 'Using VPN/Tor, avoiding address reuse, and not linking personal identity to wallets', 'Posting transaction receipts for transparency', 'Using the same address for all transactions'],
          uk: ['Використання справжнього імені на всіх платформах', 'Використання VPN/Tor, уникнення повторного використання адрес та нив\'язування особистої ідентичності до гаманців', 'Публікація квитанцій транзакцій для прозорості', 'Використання однієї адреси для всіх транзакцій']
        },
        correct: 1
      },
      {
        sectionId: 'a-ceremony',
        sectionTitle: { en: 'Key Ceremony Procedures', uk: 'Процедури церемонії ключів' },
        question: {
          en: 'What is a "key ceremony" in the context of crypto OpSec?',
          uk: 'Що таке "церемонія ключів" у контексті крипто-OpSec?'
        },
        options: {
          en: ['A celebration when you buy your first crypto', 'A formal, documented procedure for securely generating and backing up keys in a controlled environment', 'A method for sharing keys between team members', 'An annual key rotation schedule'],
          uk: ['Святкування, коли ви купуєте першу крипту', 'Формальна, задокументована процедура безпечної генерації та резервного копіювання ключів у контрольованому середовищі', 'Метод обміну ключами між членами команди', 'Щорічний графік ротації ключів']
        },
        correct: 1
      },
      {
        sectionId: 'a-defense',
        sectionTitle: { en: 'Multi-Layer Defense Strategy', uk: 'Багаторівнева стратегія захисту' },
        question: {
          en: 'What is the principle of "defense in depth" applied to crypto security?',
          uk: 'Що таке принцип "захисту в глибину" у крипто-безпеці?'
        },
        options: {
          en: ['Using the most expensive hardware wallet', 'Layering multiple independent security measures so that compromising one does not compromise all', 'Keeping all crypto in one highly secured location', 'Using only one trusted security vendor'],
          uk: ['Використання найдорожчого апаратного гаманця', 'Нашарування кількох незалежних заходів безпеки, щоб компрометація одного не призвела до компрометації всіх', 'Зберігання всієї крипти в одному захищеному місці', 'Використання лише одного довіреного постачальника безпеки']
        },
        correct: 1
      },
      {
        sectionId: 'a-inheritance',
        sectionTitle: { en: 'Inheritance and Dead Man\'s Switch', uk: 'Спадкування та Dead Man\'s Switch' },
        question: {
          en: 'Why is an inheritance plan important for crypto holders?',
          uk: 'Чому план спадкування важливий для власників крипти?'
        },
        options: {
          en: ['To avoid paying taxes', 'Without a plan, self-custodied funds are permanently lost if you become incapacitated or die', 'To allow automatic trading', 'It is a legal requirement in most countries'],
          uk: ['Щоб уникнути сплати податків', 'Без плану кошти на самостійному зберіганні назавжди втрачаються, якщо ви стаєте недієздатним або помираєте', 'Для автоматичної торгівлі', 'Це юридична вимога в більшості країн']
        },
        correct: 1
      },
      {
        sectionId: 'a-verification',
        sectionTitle: { en: 'Verification and Trust Minimization', uk: 'Верифікація та мінімізація довіри' },
        question: {
          en: 'How should you verify the authenticity of wallet firmware before installing?',
          uk: 'Як потрібно перевіряти автентичність прошивки гаманця перед встановленням?'
        },
        options: {
          en: ['Trust the app store rating', 'Check the GPG/PGP signature against the manufacturer\'s published keys', 'Read user reviews online', 'The wallet verifies itself automatically'],
          uk: ['Довіряти рейтингу в магазині застосунків', 'Перевірити GPG/PGP-підпис з опублікованими ключами виробника', 'Читати відгуки користувачів онлайн', 'Гаманець перевіряє себе автоматично']
        },
        correct: 1
      }
    ]
  },

  /* ===================================================================
     PASSPHRASE
     =================================================================== */
  'passphrase': {
    beginner: [
      {
        sectionId: 'b-what-is',
        sectionTitle: { en: 'What Is the 25th Word?', uk: 'Що таке 25-те слово?' },
        question: {
          en: 'What is the BIP39 passphrase commonly known as?',
          uk: 'Як зазвичай називають пасфразу BIP39?'
        },
        options: {
          en: ['The master password', 'The 25th word', 'The recovery PIN', 'The wallet password'],
          uk: ['Майстер-пароль', '25-те слово', 'PIN відновлення', 'Пароль гаманця']
        },
        correct: 1
      },
      {
        sectionId: 'b-how-works',
        sectionTitle: { en: 'How Does It Work?', uk: 'Як це працює?' },
        question: {
          en: 'What happens when you add a passphrase to your seed phrase?',
          uk: 'Що відбувається, коли ви додаєте пасфразу до сід-фрази?'
        },
        options: {
          en: ['Your original wallet gets encrypted', 'A completely different wallet is derived from the same seed words', 'The seed phrase becomes longer', 'Your transaction history is hidden'],
          uk: ['Ваш оригінальний гаманець шифрується', 'З тих самих слів сіда виводиться зовсім інший гаманець', 'Сід-фраза стає довшою', 'Ваша історія транзакцій приховується']
        },
        correct: 1
      },
      {
        sectionId: 'b-hidden-wallets',
        sectionTitle: { en: 'Hidden Wallets and Plausible Deniability', uk: 'Приховані гаманці та правдоподібне заперечення' },
        question: {
          en: 'What is "plausible deniability" in the context of passphrases?',
          uk: 'Що таке "правдоподібне заперечення" в контексті пасфраз?'
        },
        options: {
          en: ['Denying you own any cryptocurrency', 'Having a decoy wallet (no passphrase) while your real funds are in a passphrase-protected wallet', 'Using a fake seed phrase', 'Encrypting your blockchain data'],
          uk: ['Заперечення володіння криптовалютою', 'Наявність гаманця-приманки (без пасфрази), тоді як реальні кошти захищені пасфразою', 'Використання фальшивої сід-фрази', 'Шифрування даних блокчейну']
        },
        correct: 1
      },
      {
        sectionId: 'b-risks',
        sectionTitle: { en: 'Risks and Responsibilities', uk: 'Ризики та відповідальність' },
        question: {
          en: 'What is the biggest risk of using a passphrase?',
          uk: 'Який найбільший ризик використання пасфрази?'
        },
        options: {
          en: ['It slows down transactions', 'If you forget or lose it, your funds are permanently inaccessible', 'It makes your wallet incompatible with exchanges', 'It costs extra gas fees'],
          uk: ['Це сповільнює транзакції', 'Якщо ви забудете або втратите її, ваші кошти будуть назавжди недоступні', 'Це робить гаманець несумісним з біржами', 'Це коштує додаткових комісій']
        },
        correct: 1
      },
      {
        sectionId: 'b-risks',
        sectionTitle: { en: 'Passphrase Best Practices', uk: 'Найкращі практики пасфрази' },
        question: {
          en: 'How should you store a passphrase relative to your seed phrase?',
          uk: 'Як слід зберігати пасфразу відносно сід-фрази?'
        },
        options: {
          en: ['Together in the same location for convenience', 'In separate physical locations so compromising one does not compromise both', 'Only in digital form on your phone', 'You don\'t need to back up a passphrase'],
          uk: ['Разом в одному місці для зручності', 'В окремих фізичних місцях, щоб компрометація одного не призвела до компрометації обох', 'Тільки в цифровій формі на телефоні', 'Пасфразу не потрібно зберігати']
        },
        correct: 1
      }
    ],
    advanced: [
      {
        sectionId: 'a-cryptographic',
        sectionTitle: { en: 'Cryptographic Mechanism', uk: 'Криптографічний механізм' },
        question: {
          en: 'How does the BIP39 passphrase alter the wallet derivation?',
          uk: 'Як пасфраза BIP39 змінює деривацію гаманця?'
        },
        options: {
          en: ['It adds extra words to the mnemonic', 'It is used as the salt in the PBKDF2 function, producing a different 512-bit seed', 'It encrypts the private key with AES', 'It changes the derivation path from BIP44 to BIP49'],
          uk: ['Вона додає додаткові слова до мнемоніки', 'Вона використовується як сіль у функції PBKDF2, створюючи інший 512-бітний сід', 'Вона шифрує приватний ключ за допомогою AES', 'Вона змінює шлях деривації з BIP44 на BIP49']
        },
        correct: 1
      },
      {
        sectionId: 'a-entropy-analysis',
        sectionTitle: { en: 'Passphrase Entropy Analysis', uk: 'Аналіз ентропії пасфрази' },
        question: {
          en: 'Why is a short passphrase like "bitcoin" considered weak?',
          uk: 'Чому коротка пасфраза на кшталт "bitcoin" вважається слабкою?'
        },
        options: {
          en: ['It contains a cryptocurrency name', 'It has low entropy and is easily guessable through dictionary attacks', 'BIP39 does not accept single-word passphrases', 'It conflicts with blockchain protocol naming'],
          uk: ['Вона містить назву криптовалюти', 'Вона має низьку ентропію і легко вгадується через словникові атаки', 'BIP39 не приймає однослівні пасфрази', 'Вона конфліктує з назвами протоколу блокчейну']
        },
        correct: 1
      },
      {
        sectionId: 'a-implementation',
        sectionTitle: { en: 'Implementation Across Wallet Software', uk: 'Реалізація в різних гаманцях' },
        question: {
          en: 'What happens if you enter the wrong passphrase in your wallet?',
          uk: 'Що станеться, якщо ви введете неправильну пасфразу в гаманець?'
        },
        options: {
          en: ['You get an error message', 'A valid but empty wallet is generated — there is no "wrong passphrase" error', 'The wallet locks after 3 attempts', 'Your seed phrase is invalidated'],
          uk: ['Ви отримаєте повідомлення про помилку', 'Генерується валідний, але порожній гаманець — помилки "неправильна пасфраза" не існує', 'Гаманець блокується після 3 спроб', 'Ваша сід-фраза стає недійсною']
        },
        correct: 1
      },
      {
        sectionId: 'a-advanced-strategies',
        sectionTitle: { en: 'Advanced Passphrase Strategies', uk: 'Просунуті стратегії пасфрази' },
        question: {
          en: 'What is a "decoy wallet" strategy with passphrases?',
          uk: 'Що таке стратегія "гаманця-приманки" з пасфразами?'
        },
        options: {
          en: ['Using a fake seed phrase', 'Keeping small funds in the base wallet (no passphrase) while significant funds are in a passphrase-protected wallet', 'Creating multiple wallets on different hardware', 'Using a passphrase that looks like a real word'],
          uk: ['Використання фальшивої сід-фрази', 'Зберігання невеликих коштів у базовому гаманці (без пасфрази), тоді як значні кошти в гаманці з пасфразою', 'Створення кількох гаманців на різних пристроях', 'Використання пасфрази, що виглядає як справжнє слово']
        },
        correct: 1
      },
      {
        sectionId: 'a-threat-model',
        sectionTitle: { en: 'Threat Model Integration', uk: 'Інтеграція моделі загроз' },
        question: {
          en: 'In which scenario does a passphrase NOT protect your funds?',
          uk: 'У якому сценарії пасфраза НЕ захищає ваші кошти?'
        },
        options: {
          en: ['Physical theft of your seed phrase backup', 'A $5 wrench attack where the attacker knows you use a passphrase and coerces you to reveal it', 'Remote hacking of your computer', 'A compromised hardware wallet supply chain'],
          uk: ['Фізична крадіжка резервної копії сід-фрази', 'Атака "гайковим ключем за $5", коли зловмисник знає про пасфразу і змушує вас її розкрити', 'Віддалений злом вашого комп\'ютера', 'Компрометований ланцюг постачання апаратного гаманця']
        },
        correct: 1
      }
    ]
  },

  /* ===================================================================
     MULTISIG
     =================================================================== */
  'multisig': {
    beginner: [
      {
        sectionId: 'b-what-is',
        sectionTitle: { en: 'What Is Multisig?', uk: 'Що таке мультипідпис?' },
        question: {
          en: 'What is a multisig (multi-signature) wallet?',
          uk: 'Що таке мультипідписний гаманець?'
        },
        options: {
          en: ['A wallet with multiple addresses', 'A wallet that requires multiple keys to authorize a transaction', 'A wallet shared between multiple users online', 'A wallet with multi-factor authentication'],
          uk: ['Гаманець з кількома адресами', 'Гаманець, який потребує кілька ключів для авторизації транзакції', 'Гаманець, спільний для кількох користувачів онлайн', 'Гаманець з багатофакторною автентифікацією']
        },
        correct: 1
      },
      {
        sectionId: 'b-why',
        sectionTitle: { en: 'Why Use Multisig?', uk: 'Навіщо використовувати мультипідпис?' },
        question: {
          en: 'What is the main security advantage of multisig over a single-key wallet?',
          uk: 'Яка головна перевага безпеки мультипідпису порівняно з однокключовим гаманцем?'
        },
        options: {
          en: ['Faster transactions', 'No single point of failure — compromising one key is not enough to steal funds', 'Lower transaction fees', 'Better compatibility with exchanges'],
          uk: ['Швидші транзакції', 'Відсутність єдиної точки відмови — компрометація одного ключа недостатня для крадіжки коштів', 'Нижчі комісії транзакцій', 'Краща сумісність з біржами']
        },
        correct: 1
      },
      {
        sectionId: 'b-configs',
        sectionTitle: { en: 'Common Configurations', uk: 'Поширені конфігурації' },
        question: {
          en: 'In a 2-of-3 multisig, what do the numbers mean?',
          uk: 'У мультипідписі 2-з-3, що означають ці числа?'
        },
        options: {
          en: ['2 transactions out of 3 are verified', '2 signatures required out of 3 total keys to authorize a transaction', '2 users share 3 wallets', '2 confirmations needed on 3 different blockchains'],
          uk: ['2 транзакції з 3 перевіряються', '2 підписи потрібні з 3 загальних ключів для авторизації транзакції', '2 користувачі ділять 3 гаманці', '2 підтвердження потрібні на 3 різних блокчейнах']
        },
        correct: 1
      },
      {
        sectionId: 'b-setup',
        sectionTitle: { en: 'Setting Up Your First Multisig', uk: 'Налаштування першого мультипідпису' },
        question: {
          en: 'What is critical to back up when setting up a multisig wallet?',
          uk: 'Що критично важливо зберегти при налаштуванні мультипідписного гаманця?'
        },
        options: {
          en: ['Only the first key', 'All individual key backups plus the wallet configuration (descriptor/policy)', 'Just the transaction history', 'The software version number'],
          uk: ['Тільки перший ключ', 'Усі індивідуальні резервні копії ключів плюс конфігурацію гаманця (дескриптор/політику)', 'Лише історію транзакцій', 'Номер версії програмного забезпечення']
        },
        correct: 1
      },
      {
        sectionId: 'b-setup',
        sectionTitle: { en: 'Multisig Trade-offs', uk: 'Компроміси мультипідпису' },
        question: {
          en: 'What is a disadvantage of using multisig compared to single-key?',
          uk: 'Який недолік мультипідпису порівняно з однокключовим?'
        },
        options: {
          en: ['Lower security', 'More complex setup, backup, and recovery procedures', 'Cannot hold Bitcoin', 'Requires internet for all keys'],
          uk: ['Нижча безпека', 'Складніше налаштування, резервне копіювання та процедури відновлення', 'Не може зберігати Bitcoin', 'Потрібен інтернет для всіх ключів']
        },
        correct: 1
      }
    ],
    advanced: [
      {
        sectionId: 'a-scripts',
        sectionTitle: { en: 'Bitcoin Script and Multisig', uk: 'Bitcoin Script та мультипідпис' },
        question: {
          en: 'How does Bitcoin Script enforce multisig spending conditions?',
          uk: 'Як Bitcoin Script забезпечує умови витрачання мультипідпису?'
        },
        options: {
          en: ['Through smart contracts like Ethereum', 'Using OP_CHECKMULTISIG opcode that verifies M-of-N signatures against public keys', 'By storing rules on a separate sidechain', 'Through external oracle verification'],
          uk: ['Через смарт-контракти як у Ethereum', 'За допомогою опкоду OP_CHECKMULTISIG, який перевіряє M-з-N підписів проти публічних ключів', 'Зберіганням правил на окремому сайдчейні', 'Через зовнішню верифікацію оракулом']
        },
        correct: 1
      },
      {
        sectionId: 'a-descriptors',
        sectionTitle: { en: 'Output Descriptors and Wallet Recovery', uk: 'Дескриптори виходів та відновлення гаманця' },
        question: {
          en: 'Why are output descriptors essential for multisig wallet recovery?',
          uk: 'Чому дескриптори виходів є необхідними для відновлення мультипідписного гаманця?'
        },
        options: {
          en: ['They encrypt the wallet data', 'They describe the exact spending policy and all participating keys needed to reconstruct the wallet', 'They speed up blockchain synchronization', 'They are optional metadata for tracking purposes'],
          uk: ['Вони шифрують дані гаманця', 'Вони описують точну політику витрачання та всі ключі-учасники, необхідні для реконструкції гаманця', 'Вони прискорюють синхронізацію блокчейну', 'Вони є необов\'язковими метаданими для відстеження']
        },
        correct: 1
      },
      {
        sectionId: 'a-taproot',
        sectionTitle: { en: 'Taproot Multisig and MuSig2', uk: 'Taproot мультипідпис та MuSig2' },
        question: {
          en: 'What privacy advantage does Taproot bring to multisig transactions?',
          uk: 'Яку перевагу приватності Taproot приносить мультипідписним транзакціям?'
        },
        options: {
          en: ['It hides the transaction amount', 'Multisig spends look identical to single-sig spends on the blockchain', 'It encrypts the recipient address', 'It makes transactions completely anonymous'],
          uk: ['Він приховує суму транзакції', 'Мультипідписні витрати виглядають ідентично однопідписним у блокчейні', 'Він шифрує адресу отримувача', 'Він робить транзакції повністю анонімними']
        },
        correct: 1
      },
      {
        sectionId: 'a-key-management',
        sectionTitle: { en: 'Key Management and Vendor Diversity', uk: 'Управління ключами та диверсифікація вендорів' },
        question: {
          en: 'Why is vendor diversity recommended for multisig key storage?',
          uk: 'Чому для зберігання ключів мультипідпису рекомендується диверсифікація вендорів?'
        },
        options: {
          en: ['For better customer support', 'To prevent a single vendor\'s vulnerability or supply chain attack from compromising the quorum', 'To get volume discounts', 'It is a legal requirement'],
          uk: ['Для кращої підтримки клієнтів', 'Щоб запобігти компрометації кворуму через вразливість одного вендора або атаку на ланцюг постачання', 'Для отримання знижок за обсяг', 'Це юридична вимога']
        },
        correct: 1
      },
      {
        sectionId: 'a-collaborative',
        sectionTitle: { en: 'Collaborative Custody Services', uk: 'Сервіси спільного зберігання' },
        question: {
          en: 'In collaborative custody (e.g., 2-of-3 with a provider), who holds the keys?',
          uk: 'У спільному зберіганні (напр., 2-з-3 з провайдером), хто тримає ключі?'
        },
        options: {
          en: ['The provider holds all 3 keys', 'You hold 2 keys, the provider holds 1 — you can always spend independently', 'The provider holds 2 keys for security', 'Keys are split equally between 3 parties'],
          uk: ['Провайдер тримає всі 3 ключі', 'Ви тримаєте 2 ключі, провайдер тримає 1 — ви завжди можете витратити самостійно', 'Провайдер тримає 2 ключі для безпеки', 'Ключі розділені порівну між 3 сторонами']
        },
        correct: 1
      }
    ]
  },

  /* ===================================================================
     HODL
     =================================================================== */
  'hodl': {
    beginner: [
      {
        sectionId: 'b-what-is',
        sectionTitle: { en: 'What Is HODL?', uk: 'Що таке HODL?' },
        question: {
          en: 'What does "HODL" stand for in the crypto community?',
          uk: 'Що означає "HODL" у крипто-спільноті?'
        },
        options: {
          en: ['High Output Digital Ledger', 'Hold On for Dear Life — a strategy of long-term holding', 'Highly Optimized Distributed Ledger', 'Hardware Operated Digital Locker'],
          uk: ['High Output Digital Ledger', 'Hold On for Dear Life — стратегія довгострокового утримання', 'Highly Optimized Distributed Ledger', 'Hardware Operated Digital Locker']
        },
        correct: 1
      },
      {
        sectionId: 'b-why-hodl',
        sectionTitle: { en: 'Why Do People HODL?', uk: 'Чому люди HODLять?' },
        question: {
          en: 'What is the core thesis behind HODLing Bitcoin?',
          uk: 'Яка основна теза HODLінгу Bitcoin?'
        },
        options: {
          en: ['Bitcoin\'s price only goes up', 'Bitcoin\'s fixed supply and increasing adoption should drive long-term value appreciation', 'HODLing guarantees profits', 'Bitcoin replaces all other currencies immediately'],
          uk: ['Ціна Bitcoin тільки зростає', 'Фіксована пропозиція Bitcoin та зростаюче прийняття мають стимулювати довгострокове зростання вартості', 'HODLінг гарантує прибуток', 'Bitcoin негайно замінює всі інші валюти']
        },
        correct: 1
      },
      {
        sectionId: 'b-vs-trading',
        sectionTitle: { en: 'HODL vs. Trading', uk: 'HODL проти трейдингу' },
        question: {
          en: 'Why do most studies suggest HODLing outperforms active trading for typical investors?',
          uk: 'Чому більшість досліджень стверджують, що HODLінг перевершує активний трейдинг для типових інвесторів?'
        },
        options: {
          en: ['Trading is illegal in most countries', 'Most traders underperform due to fees, taxes, and emotional decision-making', 'HODLing has no risk', 'Trading platforms are always unreliable'],
          uk: ['Трейдинг нелегальний у більшості країн', 'Більшість трейдерів програють через комісії, податки та емоційні рішення', 'HODLінг не має ризику', 'Торгові платформи завжди ненадійні']
        },
        correct: 1
      },
      {
        sectionId: 'b-psychology',
        sectionTitle: { en: 'The Psychology of HODLing', uk: 'Психологія HODLінгу' },
        question: {
          en: 'What psychological trap causes HODLers to sell at the worst time?',
          uk: 'Яка психологічна пастка змушує HODLерів продавати в найгірший момент?'
        },
        options: {
          en: ['Overconfidence', 'Panic selling during market crashes driven by fear and loss aversion', 'Boredom with the investment', 'Social media influence only'],
          uk: ['Надмірна впевненість', 'Панічний продаж під час обвалу ринку через страх та відразу до втрат', 'Нудьга від інвестиції', 'Лише вплив соціальних мереж']
        },
        correct: 1
      },
      {
        sectionId: 'b-mistakes',
        sectionTitle: { en: 'Common HODL Mistakes', uk: 'Поширені помилки HODL' },
        question: {
          en: 'Which is a common mistake made by long-term holders?',
          uk: 'Яка поширена помилка довгострокових утримувачів?'
        },
        options: {
          en: ['Using hardware wallets', 'Investing more than they can afford to lose', 'Using DCA strategy', 'Storing seed phrases offline'],
          uk: ['Використання апаратних гаманців', 'Інвестування більше, ніж вони можуть дозволити собі втратити', 'Використання стратегії DCA', 'Зберігання сід-фраз офлайн']
        },
        correct: 1
      }
    ],
    advanced: [
      {
        sectionId: 'a-game-theory',
        sectionTitle: { en: 'Game Theory of HODLing', uk: 'Теорія ігор HODLінгу' },
        question: {
          en: 'How does Bitcoin\'s halving cycle relate to HODL strategy?',
          uk: 'Як цикл халвінгу Bitcoin пов\'язаний зі стратегією HODL?'
        },
        options: {
          en: ['Halving doubles the number of Bitcoin', 'Halving reduces new supply by 50%, creating supply shock that historically precedes price appreciation cycles', 'Halving makes mining impossible', 'Halving has no effect on price'],
          uk: ['Халвінг подвоює кількість Bitcoin', 'Халвінг зменшує нову пропозицію на 50%, створюючи шок пропозиції, що історично передує циклам зростання ціни', 'Халвінг робить майнінг неможливим', 'Халвінг не впливає на ціну']
        },
        correct: 1
      },
      {
        sectionId: 'a-dca',
        sectionTitle: { en: 'Dollar-Cost Averaging (DCA)', uk: 'Усереднення вартості (DCA)' },
        question: {
          en: 'What is the key principle of Dollar-Cost Averaging?',
          uk: 'Який ключовий принцип усереднення вартості (DCA)?'
        },
        options: {
          en: ['Buying only at the lowest price', 'Investing a fixed amount at regular intervals regardless of market price', 'Waiting for a specific price target before buying', 'Selling a fixed amount regularly'],
          uk: ['Купувати лише за найнижчою ціною', 'Інвестувати фіксовану суму через регулярні інтервали незалежно від ринкової ціни', 'Чекати конкретної цінової мети перед покупкою', 'Продавати фіксовану суму регулярно']
        },
        correct: 1
      },
      {
        sectionId: 'a-tax',
        sectionTitle: { en: 'Tax Implications of HODLing', uk: 'Податкові наслідки HODLінгу' },
        question: {
          en: 'How does holding period typically affect crypto taxation in many jurisdictions?',
          uk: 'Як період утримання зазвичай впливає на оподаткування крипти в багатьох юрисдикціях?'
        },
        options: {
          en: ['Holding longer always eliminates all taxes', 'Many jurisdictions offer lower capital gains tax rates for assets held longer than a specific period', 'HODLing is always tax-free', 'Only day trading is taxed'],
          uk: ['Довше утримання завжди усуває всі податки', 'Багато юрисдикцій пропонують нижчі ставки податку на приріст капіталу для активів, утримуваних довше за визначений період', 'HODLінг завжди звільнений від податків', 'Лише денний трейдинг оподатковується']
        },
        correct: 1
      },
      {
        sectionId: 'a-on-chain',
        sectionTitle: { en: 'On-Chain Metrics for HODLers', uk: 'Он-чейн метрики для HODLерів' },
        question: {
          en: 'What does the "HODL Waves" chart show?',
          uk: 'Що показує графік "HODL Waves"?'
        },
        options: {
          en: ['Price prediction waves', 'The age distribution of all Bitcoin UTXOs — how long coins have been held without moving', 'Trading volume patterns', 'Network hash rate fluctuations'],
          uk: ['Хвилі прогнозування ціни', 'Розподіл за віком усіх Bitcoin UTXO — як довго монети утримувалися без переміщення', 'Патерни обсягу торгів', 'Коливання хешрейту мережі']
        },
        correct: 1
      },
      {
        sectionId: 'a-risk',
        sectionTitle: { en: 'Risk Management for Long-Term Holders', uk: 'Управління ризиками для довгострокових утримувачів' },
        question: {
          en: 'What risk management strategy should HODLers implement?',
          uk: 'Яку стратегію управління ризиками мають впроваджувати HODLери?'
        },
        options: {
          en: ['Go all-in on a single asset', 'Position sizing, never investing more than they can afford to lose, and securing keys with proper self-custody', 'Ignore market developments entirely', 'Leverage trading to maximize returns'],
          uk: ['Вкласти все в один актив', 'Розмір позицій, ніколи не інвестувати більше, ніж можна дозволити втратити, та забезпечення ключів належним самостійним зберіганням', 'Повністю ігнорувати ринкові розробки', 'Використовувати маржинальну торгівлю для максимізації прибутку']
        },
        correct: 1
      }
    ]
  }

};
