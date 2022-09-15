/* global Chart, seeds, start, calc */

const ITERATIONS = 1000;

const options = {
  responsive: true,
  maintainAspectRatio: false,
  animation: {
    duration: 0
  },
  scales: {
    y: {
      max: 255,
      min: 0,
      ticks: {
        stepSize: 1
      }
    }
  }
};
const chart = new Chart(document.getElementById('chart').getContext('2d'), {
  type: 'bar',
  data: {
    labels: [...new Array(32)].map((a, i) => i + 1),
    datasets: [{
      label: 'Current Seed',
      backgroundColor: 'rgb(188, 224, 255)',
      data: []
    }, {
      label: 'Averaged of All Generated Seeds',
      backgroundColor: 'rgb(228, 228, 228)',
      data: []
    }]
  },
  options
});
const draw = t => {
  const r = Object.values(t).map(Number).map(v => Math.round(v));
  document.getElementById('min').textContent = Math.min(...r).toFixed(1);
  document.getElementById('max').textContent = Math.max(...r).toFixed(1);
  document.getElementById('avg').textContent = (r.reduce((p, c) => c + p, 0) / r.length).toFixed(1);

  chart.data.datasets[1].data = Object.values(t);
  chart.data.datasets[0].data = seeds[seeds.length - 1];
  chart.update();
};

const stats = () => {
  const t = {};
  for (let i = 0; i < seeds.length; i += 1) {
    for (let j = 0; j < seeds[i].length; j += 1) {
      t[j] = t[j] || 0;
      t[j] += seeds[i][j];
    }
  }
  for (let i = 0; i < seeds[0].length; i += 1) {
    t[i] = t[i] / seeds.length;
  }
  draw(t);
};
document.addEventListener('key-calculated', stats);

const open = id => {
  const a = document.createElement('a');
  a.target = '_blank';
  a.href = 'https://www.blockchain.com/btc/address/' + document.getElementById(id).value;
  a.click();
};

document.getElementById('explore').addEventListener('click', () => {
  open('public-address');
  open('public-address-compressed');
  open('public-address-segwit');
});

const duplicatecheck = () => {
  const _seeds = seeds.reduce((a, b) => {
    if (a.indexOf(b) < 0) {
      a.push(b);
    }
    return a;
  }, []);
  const duplicate = _seeds.length !== seeds.length;
  document.getElementById('duplicate').textContent = duplicate;
  document.getElementById('iterations').textContent = seeds.length;
};

document.getElementById('integritycheck').addEventListener('click', async e => {
  document.getElementById('duplicate').textContent = '...';
  document.getElementById('iterations').textContent = '...';
  //
  e.target.disabled = true;
  const loop = async () => {
    for (let i = 0; i < ITERATIONS; i++) {
      document.getElementById('iterations').textContent = seeds.length;
      e.target.value = `${i} / ${ITERATIONS}`;
      await start(true);
      await calc();
    }
  };
  //
  await loop();
  duplicatecheck();
  e.target.value = 'Integrity Check';
  e.target.disabled = false;
});


document.getElementById('export').addEventListener('click', () => {
  const content = `Your BTC address
--------------------------------------------------------------------------------

Generation Date: ${(new Date().toLocaleString())}

--------------------------------------------------------------------------------

[Compressed Version]

Private Key: ${document.getElementById('private-key-wif-compressed').value}
Format: WIF - Wallet Import Format

Public Address: ${document.getElementById('public-address-compressed').value}
Format: BASE58 (P2PKH)

Public Address: ${document.getElementById('public-address-segwit').value}
Format: BECH32 (P2WPKH) -  Native SegWit

--------------------------------------------------------------------------------

[Uncompressed Version]

Private Key: ${document.getElementById('private-key-wif').value}
Format: WIF - Wallet Import Format

Public Address: ${document.getElementById('public-address').value}
Format: BASE58 (P2PKH)
`;
  const href = 'data:text/plain;base64,' + btoa(content);
  const a = document.createElement('a');
  a.href = href;
  a.download = 'btc.txt';
  document.body.appendChild(a);
  a.click();
  a.remove();
});

document.getElementById('networkcheck').addEventListener('click', () => fetch('https://www.example.com').then(r => {
  alert(r.ok ? 'Was able to access the Internet' : 'No Internet access');
}).catch(e => alert('No Internet access: ' + e.message)));
