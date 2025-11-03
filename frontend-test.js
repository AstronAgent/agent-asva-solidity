const ACCESS_ADDRESS = "0x92a2f8F3cC2c7E4CB9B772C060f84D4d2F441d66";
const USDC_ADDRESS   = "0x69c11e54051401b254fFE969e2709447817DD547"; // mUSDC (6 decimals)
const USDT_ADDRESS   = "0x071048c25e28E8Af737A9Aa0edA631426C1932A9"; // mUSDT (6 decimals)

const ACCESS_ABI = [
  "function purchaseSubscriptionWithToken(uint8 planId, address token, uint256 amountUnits) external",
  "function plans(uint8) view returns (uint256 priceUnits, uint256 monthlyCap, bool active)"
];

const ERC20_ABI = [
  "function approve(address spender, uint256 value) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address who) external view returns (uint256)",
  "function decimals() external view returns (uint8)"
];

const PLAN_PRICE_UNITS = { 1: 99_000_000, 2: 129_000_000, 3: 149_000_000 }; // 6 decimals

let provider, signer, account;
let usdcC, usdtC, accessC;
let isPending = false;

function log(msg) {
  const el = document.getElementById('log');
  el.textContent += (typeof msg === 'string' ? msg : JSON.stringify(msg)) + "\n";
  el.scrollTop = el.scrollHeight;
}

async function connect() {
  if (!window.ethereum) { alert('Install MetaMask'); return; }
  await window.ethereum.request({ method: 'eth_requestAccounts' });
  provider = new ethers.BrowserProvider(window.ethereum);
  signer = await provider.getSigner();
  account = await signer.getAddress();
  const chainId = await provider.send('eth_chainId', []);
  log(`Connected: ${account}`);
  log(`ChainId: ${chainId}`);
  if (chainId !== '0xaa36a7') {
    log('Warning: Not on Sepolia (0xaa36a7).');
  }
  // init contracts
  usdcC = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, signer);
  usdtC = new ethers.Contract(USDT_ADDRESS, ERC20_ABI, signer);
  accessC = new ethers.Contract(ACCESS_ADDRESS, ACCESS_ABI, signer);
  await refreshBalances();
}

async function switchToSepolia() {
  if (!window.ethereum) { alert('Install MetaMask'); return; }
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: '0xaa36a7' }]
    });
  } catch (switchError) {
    if (switchError.code === 4902) {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: '0xaa36a7',
          chainName: 'Sepolia',
          nativeCurrency: { name: 'SepoliaETH', symbol: 'ETH', decimals: 18 },
          rpcUrls: ['https://sepolia.infura.io/v3/'],
          blockExplorerUrls: ['https://sepolia.etherscan.io']
        }]
      });
    } else {
      log(`Switch error: ${switchError.message || switchError}`);
    }
  }
  if (provider) {
    const cid = await provider.send('eth_chainId', []);
    log(`Now on chainId: ${cid}`);
  }
}

async function refreshBalances() {
  try {
    if (!provider || !account) return;
    const ethBal = await provider.getBalance(account);
    document.getElementById('acct').textContent = account;
    document.getElementById('eth').textContent = ethers.formatEther(ethBal);
    if (usdcC && usdtC) {
      const [usdcB, usdtB] = await Promise.all([
        usdcC.balanceOf(account),
        usdtC.balanceOf(account)
      ]);
      document.getElementById('usdc').textContent = Number(usdcB).toLocaleString();
      document.getElementById('usdt').textContent = Number(usdtB).toLocaleString();
    }
  } catch (e) {
    log(`Balance error: ${e.message || e}`);
  }
}

function getSelections() {
  const planId = Number(document.getElementById('plan').value);
  const tokenSel = document.getElementById('token').value;
  const tokenAddr = tokenSel === 'USDC' ? USDC_ADDRESS : USDT_ADDRESS;
  const amountUnits = PLAN_PRICE_UNITS[planId];
  return { planId, tokenAddr, amountUnits };
}

async function approve() {
  try {
    if (isPending) return;
    isPending = true;
    document.getElementById('approveBtn').disabled = true;
    document.getElementById('purchaseBtn').disabled = true;
    if (!signer) await connect();
    const { tokenAddr, amountUnits } = getSelections();
    const erc20 = new ethers.Contract(tokenAddr, ERC20_ABI, signer);
    const tx = await erc20.approve(ACCESS_ADDRESS, amountUnits);
    log(`Approve tx: ${tx.hash}`);
    await tx.wait();
    log('Approve confirmed.');
    await refreshBalances();
  } catch (e) {
    log(`Approve error: ${e.message || e}`);
  } finally {
    isPending = false;
    document.getElementById('approveBtn').disabled = false;
    document.getElementById('purchaseBtn').disabled = false;
  }
}

async function purchase() {
  try {
    if (isPending) return;
    isPending = true;
    document.getElementById('approveBtn').disabled = true;
    document.getElementById('purchaseBtn').disabled = true;
    if (!signer) await connect();
    const { planId, tokenAddr, amountUnits } = getSelections();
    const access = new ethers.Contract(ACCESS_ADDRESS, ACCESS_ABI, signer);
    const tx = await access.purchaseSubscriptionWithToken(planId, tokenAddr, amountUnits);
    log(`Purchase tx: ${tx.hash}`);
    await tx.wait();
    log('Purchase confirmed.');
    await refreshBalances();
  } catch (e) {
    log(`Purchase error: ${e.message || e}`);
  } finally {
    isPending = false;
    document.getElementById('approveBtn').disabled = false;
    document.getElementById('purchaseBtn').disabled = false;
  }
}

// Expose functions to buttons
window.connect = connect;
window.switchToSepolia = switchToSepolia;
window.refreshBalances = refreshBalances;
window.approve = approve;
window.purchase = purchase;


