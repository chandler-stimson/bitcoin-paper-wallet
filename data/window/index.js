/* global b58, secp, ripemd160 */
/*
Reference: http://procbits.com/2013/08/27/generating-a-bitcoin-address-with-javascript
*/

const seeds = [];
const WEIGHT = 0.01;

const convert = {
  u2h(ua) { // Uint8Array to HEX converter
    return [...ua].map(x => x.toString(16).padStart(2, '0')).join('');
  },
  h2u(hex) {
    const result = [];
    for (let i = 0; i < hex.length; i += 2) {
      result.push(parseInt(hex.substr(i, 2), 16));
    }
    return new Uint8Array(result);
  },
  sha256(ua) {
    if (typeof ua === 'string') {
      ua = convert.h2u(ua);
    }

    return crypto.subtle.digest('SHA-256', ua).then(buffer => new Uint8Array(buffer));
  },
  // double sha256 on a hex string
  async checksum(hex) {
    const once = await convert.sha256(hex);
    const twice = await convert.sha256(once);

    return convert.u2h(twice).substr(0, 8);
  }
};

const calc = async () => {
  const numbers = [...document.querySelectorAll('#random-hex input')].map(e => Number(e.value));
  seeds.push(numbers);

  const seed = convert.u2h(numbers);
  // const seed = '1184CD2CDD640CA42CFC3A091C51D549B2F016D454B2774019C2B2D2E08529FD';

  const privateKeyAndVersion = '80' + seed;
  const checksum = await convert.checksum(privateKeyAndVersion);
  const keyWithChecksum = privateKeyAndVersion + checksum;
  const privateKeyWIF = b58.to(convert.h2u(keyWithChecksum));

  const privateKeyAndVersionCompressed = privateKeyAndVersion + '01';
  const checksumcCmpressed = await convert.checksum(privateKeyAndVersionCompressed);
  const keyWithChecksumCompressed = privateKeyAndVersionCompressed + checksumcCmpressed;
  const privateKeyWIFCompressed = b58.to(convert.h2u(keyWithChecksumCompressed));

  document.getElementById('private-key-wif').value = privateKeyWIF;
  document.getElementById('private-key-wif').dispatchEvent(new Event('change'));
  document.getElementById('private-key-wif-compressed').value = privateKeyWIFCompressed;
};

// find the initial random array from the imported WIF
document.getElementById('import').addEventListener('click', async () => {
  const wif = prompt('Enter your private key', '');
  if (wif) {
    const keyWithChecksum = convert.u2h(b58.from(wif));
    const seed = keyWithChecksum.substr(2, 64);
    const checksum = keyWithChecksum.substr(-8);
    if (wif.length !== 51 && wif.length !== 52) {
      return alert('This key is not valid; length must be either 51 or 52');
    }
    // validate
    const privateKeyAndVersion = '80' + seed + (wif.length === 52 ? '01' : '');
    if (await convert.checksum(privateKeyAndVersion) === checksum) {
      convert.h2u(seed).forEach((v, n) => {
        document.querySelector(`#random-hex input:nth-child(${n + 1})`).value = v;
      });
      calc();
    }
    else {
      alert('This key is not valid; checksum does not match.');
    }
  }
});

// generate a WIF from the provided private seed
document.getElementById('calc').addEventListener('submit', e => {
  calc();
  e.stopPropagation();
  e.preventDefault();
}, true);

// generate public address from private key
document.getElementById('private-key-wif').addEventListener('change', async e => {
  const privateKeyWIF = e.target.value;
  // validate
  const keyWithChecksum = convert.u2h(b58.from(privateKeyWIF));
  if (keyWithChecksum.substr(0, 2) !== '80') {
    throw Error('keyWithChecksum must start with 80');
  }
  const privateKeyAndVersion = keyWithChecksum.substr(0, 66);
  const privateKey = keyWithChecksum.substr(2, 64);
  const checksum = keyWithChecksum.substr(66);

  if (checksum !== await convert.checksum(privateKeyAndVersion)) {
    throw Error('Cannot verify checksum');
  }

  // public key (compressed)
  {
    const publicKeyHex = secp.getPublicKey(privateKey, true);
    const hash160 = ripemd160(await convert.sha256(publicKeyHex));
    const version = 0x00; // if using testnet, would use 0x6F or 111
    const hashAndBytes = new Uint8Array([version, ...hash160]);
    const addressChecksum = await convert.checksum(hashAndBytes);
    const unencodedAddress = '00' + convert.u2h(hash160) + addressChecksum;
    const address = b58.to(convert.h2u(unencodedAddress));
    //
    document.getElementById('public-address-compressed').value = address;
  }
  // public key (not compressed)
  {
    const publicKeyHex = secp.getPublicKey(privateKey, false);
    const hash160 = ripemd160(await convert.sha256(publicKeyHex));
    const version = 0x00; // if using testnet, would use 0x6F or 111
    const hashAndBytes = new Uint8Array([version, ...hash160]);
    const addressChecksum = await convert.checksum(hashAndBytes);
    const unencodedAddress = '00' + convert.u2h(hash160) + addressChecksum;
    const address = b58.to(convert.h2u(unencodedAddress));
    //
    document.getElementById('public-address').value = address;
  }
  //
  document.dispatchEvent(new Event('key-calculated'));
});

// generate private seed
const start = async (extraRandom = false) => {
  // create a typed array of 32 bytes (256 bits)
  const randArr = new Uint8Array(32);
  // populate array with cryptographically secure random numbers
  crypto.getRandomValues(randArr);

  if (extraRandom) {
    // use Date to add randomness
    let entropyStr = '';
    // screen size and color depth: ~4.8 to ~5.4 bits
    entropyStr += (screen.height * screen.width * screen.colorDepth);
    entropyStr += (screen.availHeight * screen.availWidth * screen.pixelDepth);
    // time zone offset: ~4 bits
    const dateObj = new Date();
    const timeZoneOffset = dateObj.getTimezoneOffset();
    entropyStr += timeZoneOffset;
    // user agent: ~8.3 to ~11.6 bits
    entropyStr += navigator.userAgent;
    // browser plugin details: ~16.2 to ~21.8 bits
    let pluginsStr = '';
    for (let i = 0; i < navigator.plugins.length; i++) {
      pluginsStr += navigator.plugins[i].name + ' ' + navigator.plugins[i].filename + ' ' + navigator.plugins[i].description + ' ' + navigator.plugins[i].version + ', ';
    }
    let mimeTypesStr = '';
    for (let i = 0; i < navigator.mimeTypes.length; i++) {
      mimeTypesStr += navigator.mimeTypes[i].description + ' ' + navigator.mimeTypes[i].type + ' ' + navigator.mimeTypes[i].suffixes + ', ';
    }
    entropyStr += pluginsStr + mimeTypesStr;
    // cookies and storage: 1 bit
    entropyStr += navigator.cookieEnabled;
    try {
      entropyStr += typeof (sessionStorage) + typeof (localStorage);
    }
    catch (e) {}
    // language: ~7 bit
    entropyStr += navigator.language;
    // history: ~2 bit
    entropyStr += history.length;

    (await convert.sha256(entropyStr)).forEach((value, n) => {
      randArr[n % 33] += Math.round(value * WEIGHT);
    });
  }
  // display results and let the user manipulate
  randArr.forEach((number, n) => {
    document.querySelector(`#random-hex input:nth-child(${n + 1})`).value = number;
  });
};

document.getElementById('mouse').addEventListener('click', async e => {
  const stack = [];

  const mouse = async () => {
    const e = stack.shift();
    if (e) {
      const m = Math.floor(Math.random() * (32 - 1 + 1) + 1);
      const n = Math.floor(Math.random() * (32 - 1 + 1) + 1);
      const o = Math.floor(Math.random() * (32 - 1 + 1) + 1);
      const inputs = [
        document.querySelector(`#random-hex input:nth-child(${m})`),
        document.querySelector(`#random-hex input:nth-child(${n})`),
        document.querySelector(`#random-hex input:nth-child(${o})`)
      ];
      const rand = [
        WEIGHT * e.clientX,
        WEIGHT * e.clientY,
        WEIGHT * Math.sqrt(Math.pow(e.clientX, 2) + Math.pow(e.clientY, 2))
      ].map(Math.round);

      inputs[0].value = (Number(inputs[0].value) + rand[0]) % 256;
      inputs[1].value = (Number(inputs[1].value) + rand[1]) % 256;
      inputs[2].value = (Number(inputs[2].value) + rand[2]) % 256;

      await calc();
    }
    else {
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  };

  e.target.disabled = true;
  document.addEventListener('mousemove', e => stack.push(e));

  let n = 0;
  const tick = () => setTimeout(() => {
    n += 1;
    e.target.value = `${n} / 10`;
    if (n < 10) {
      tick();
    }
    else {
      document.removeEventListener('mousemove', mouse);
      e.target.disabled = false;
      e.target.value = 'Mouse';
    }
  }, 1000);
  //
  tick();
  //
  while (e.target.disabled) {
    await mouse();
  }
});

// Start
start(true).then(calc);
