const SUPABASE_URL = "https://ceapqmsujottcfhrfqby.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNlYXBxbXN1am90dGNmaHJmcWJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY1MjEwMzEsImV4cCI6MjEwMjA5NzAzMX0.L_IL9PNt1kwgJk75z7rQLrMgs9AfOXcNMp9uQkASdKI";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let passwordModal, masterUserModal;
let currentUser = null;

document.addEventListener("DOMContentLoaded", function() {
    passwordModal = new bootstrap.Modal(document.getElementById('passwordModal'));
    masterUserModal = new bootstrap.Modal(document.getElementById('masterUserModal'));
    
    setInterval(updateClock, 1000);
    updateClock();
});

function updateClock() {
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];
    const clockEl = document.getElementById('liveClock');
    if(clockEl) clockEl.innerText = timeStr;
}

// INTEGRASI SUPABASE: LOGIN USER DARI DATABASE
async function loginAdmin() {
    const u = document.getElementById("adminUser").value.trim().toLowerCase();
    const p = document.getElementById("adminPass").value.trim();
    const btnSubmit = document.getElementById("btnLoginSubmit");

    btnSubmit.disabled = true;
    btnSubmit.innerHTML = `<i class="fa-solid fa-spinner fa-spin me-2"></i> Memeriksa...`;

    try {
        const { data: foundUsers, error } = await supabaseClient
            .from('app_users')
            .select('*')
            .eq('username', u)
            .eq('password', p);

        btnSubmit.disabled = false;
        btnSubmit.innerHTML = `MASUK KE SYSTEM <i class="fa-solid fa-arrow-right-to-bracket ms-2"></i>`;

        if (error) {
            console.error(error);
            alert("Terjadi kesalahan pada koneksi Supabase.");
            return;
        }

        if (foundUsers && foundUsers.length > 0) {
            currentUser = foundUsers[0];
            document.getElementById("loginError").style.display = "none";
            
            document.getElementById("loginPage").style.display = "none";
            document.getElementById("appLayout").style.display = "block";
            
            const isMaster = (currentUser.role === 'Master Admin') || (currentUser.username.toLowerCase() === 'admin');
            const roleLabel = isMaster ? 'Master Admin' : (currentUser.role || 'Auditor');

            document.getElementById("displayUsername").innerText = currentUser.name;
            document.getElementById("displayUserRole").innerText = roleLabel;
            
            document.getElementById("headerUsername").innerText = currentUser.name;
            document.getElementById("welcomeUsername").innerText = currentUser.name;
            document.getElementById("headerRole").innerText = roleLabel;

            const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(currentUser.name)}`;
            document.getElementById("displayUserAvatar").src = avatarUrl;
            document.getElementById("headerUserAvatar").src = avatarUrl;

            if (isMaster) {
                document.getElementById("menuMasterAdmin").style.display = "block";
            } else {
                document.getElementById("menuMasterAdmin").style.display = "none";
            }
        } else {
            document.getElementById("loginError").style.display = "block";
        }
    } catch (err) {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = `MASUK KE SYSTEM <i class="fa-solid fa-arrow-right-to-bracket ms-2"></i>`;
        alert("Gagal terhubung ke database. Periksa koneksi internet.");
    }
}

function logoutAdmin() { location.reload(); }

function openPasswordModal() {
    document.getElementById("newAdminPass").value = "";
    passwordModal.show();
}

async function savePasswordSettings() {
    const newPass = document.getElementById("newAdminPass").value.trim();
    if (!newPass) return alert("Password tidak boleh kosong!");

    const { error } = await supabaseClient
        .from('app_users')
        .update({ password: newPass })
        .eq('id', currentUser.id);

    if (error) {
        alert("Gagal mengubah password: " + error.message);
    } else {
        currentUser.password = newPass;
        alert("Password berhasil diubah di database Supabase!");
        passwordModal.hide();
    }
}

function openMasterUserModal() {
    renderUserList();
    masterUserModal.show();
}

async function renderUserList() {
    const tbody = document.getElementById("userListBody");
    tbody.innerHTML = `<tr><td colspan="4" class="text-muted">Memuat data...</td></tr>`;

    const { data: users, error } = await supabaseClient
        .from('app_users')
        .select('*')
        .order('id', { ascending: true });

    if (error) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-danger">Gagal memuat user.</td></tr>`;
        return;
    }

    tbody.innerHTML = "";
    users.forEach((u) => {
        const isMaster = u.username.toLowerCase() === "admin" || u.role === "Master Admin";
        tbody.innerHTML += `
            <tr>
                <td><b>${u.name}</b></td>
                <td>${u.username}</td>
                <td><span class="badge ${isMaster ? 'bg-warning text-dark' : 'bg-secondary'}">${u.role || 'Auditor'}</span></td>
                <td>
                    ${isMaster ? '-' : `<button class="btn btn-danger btn-sm py-0 px-2" style="font-size:10px;" onclick="deleteUser('${u.username}')"><i class="fa-solid fa-trash"></i> Hapus</button>`}
                </td>
            </tr>
        `;
    });
}

async function addNewUser() {
    const name = document.getElementById("addName").value.trim();
    const user = document.getElementById("addUser").value.trim().toLowerCase();
    const pass = document.getElementById("addPass").value.trim();

    if (!name || !user || !pass) return alert("Semua kolom wajib diisi!");

    const { data: existing } = await supabaseClient
        .from('app_users')
        .select('id')
        .eq('username', user);

    if (existing && existing.length > 0) {
        return alert("Username tersebut sudah digunakan!");
    }

    const { error } = await supabaseClient
        .from('app_users')
        .insert([{ name: name, username: user, password: String(pass), role: "Auditor" }]);

    if (error) {
        alert("Gagal menambahkan user: " + error.message);
    } else {
        document.getElementById("addName").value = "";
        document.getElementById("addUser").value = "";
        document.getElementById("addPass").value = "";
        renderUserList();
        alert(`Akun baru untuk "${name}" (username: ${user}) berhasil disimpan di Supabase!`);
    }
}

async function deleteUser(username) {
    if (!confirm(`Yakin ingin menghapus akun ${username}?`)) return;

    const { error } = await supabaseClient
        .from('app_users')
        .delete()
        .eq('username', username.toLowerCase());

    if (error) {
        alert("Gagal menghapus user: " + error.message);
    } else {
        renderUserList();
    }
}

function showPage(pageId, element) {
    document.querySelectorAll('.view-page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');

    if (element) {
        document.querySelectorAll('.nav-link-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        element.classList.add('active');
    }
}

function processUploadedFile(file, targetElementId) {
    if (!file) return;
    const reader = new FileReader();
    if (file.name.endsWith('.csv') || file.name.endsWith('.txt')) {
        reader.onload = function(e) { document.getElementById(targetElementId).value = e.target.result; };
        reader.readAsText(file);
    } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        reader.onload = function(e) {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {type: 'array'});
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            document.getElementById(targetElementId).value = XLSX.utils.sheet_to_csv(worksheet, {FS: "\t"});
        };
        reader.readAsArrayBuffer(file);
    }
}

// CHECKER DEPOSIT MANUAL LOGIC
const ADMIN = [ "vknaaop1", "vknaaop3", "jymaacs1", "vknaaop4", "vknaacs2", "vknaacs3", "vknaacs6",
               "kaeaacs3", "keoaacdcs1", "keoaacs1", "keoaacs2", "keoaacs7", "kaeaacs6", "kenaacdcs1",
               "kenaacs2", "vkiaacs3", "vkiaacs7", "vkiaacs8", "vkiaaop1", "vkiaaop2", "kxeaaop1",
               "liaaacs2", "licaacs4", "licaacdcs1", "jylaacs4", "jvsaacs1", "jvsaacs2", "jvsaacs3",
               "jvsaaop1", "wzgaacs16", "wzgaacs20", "wzgaacs21", "wzgaacs5", "wzgaacs6",
               "wzgaacs8", "wzgaaop1", "wzgaaop3" ];

let history = [], hasil = [];
function handleFileUpload(e) { processUploadedFile(e.target.files[0], "historytext"); }

function parseHistoryData(text) {
    let result = [];
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l !== "");
    let isHorizontal = false;
    lines.forEach(line => {
        if (/reject\s*\(\s*deposit\s*\)/i.test(line)) return;

        let parts = line.split(/,|\t|\s{2,}/).map(p => p.trim().replace(/^"|"$/g, ''));
        if (parts.length >= 4 && !line.toLowerCase().startsWith("date")) {
            isHorizontal = true;
            let dateVal = parts[0];
            let toVal = parts[2] || "";
            let byVal = parts[3] || "";
            let coinVal = parts[4] || parts[3] || "";
            if (!/\d{1,2}\/\d{1,2}\/\d{4}/.test(dateVal)) {
                let dateIdx = parts.findIndex(p => /\d{1,2}\/\d{1,2}\/\d{4}/.test(p));
                if (dateIdx !== -1) dateVal = parts[dateIdx];
            }
            result.push({ date: dateVal, to: toVal, by: byVal, coin: coinVal.replace(/,/g, "").replace(/\./g, ""), used: false });
        }
    });
    if (isHorizontal && result.length > 0) return result;
    const regexBlock = /(\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{2})([\s\S]*?)(?=(\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{2})|$)/g;
    let match;
    while ((match = regexBlock.exec(text)) !== null) {
        let dateStr = match[1].trim();
        let blockContent = match[2].trim();

        if (/reject\s*\(\s*deposit\s*\)/i.test(blockContent)) continue;

        let tokens = blockContent.split(/\s+/).map(t => t.trim()).filter(t => t !== "");
        let coinVal = "", toVal = "", byVal = "";
        tokens.forEach(t => {
            let cleanNum = t.replace(/,/g, "").replace(/\./g, "");
            if (/^\d{4,9}$/.test(cleanNum) && !coinVal) coinVal = cleanNum;
            else if (ADMIN.includes(t.toLowerCase())) byVal = t;
            else if (!toVal && !["Deposit", "(PGA)", "PGA"].includes(t) && !/^\d+$/.test(t)) toVal = t;
        });
        result.push({ date: dateStr, to: toVal, by: byVal, coin: coinVal, used: false });
    }
    return result;
}

function getDepositCount(targetUid, fullDate) {
    if (!fullDate || fullDate === "-") return "-";
    let targetDate = fullDate.split(" ")[0].trim();
    let count = 0;
    history.forEach(r => {
        if ((r.to || "").trim().toLowerCase() === targetUid.toLowerCase() && (r.date || "").split(" ")[0].trim() === targetDate && ADMIN.includes((r.by || "").trim().toLowerCase())) count++;
    });
    return count;
}

function prosesDeposit() {
    const rawText = document.getElementById("historytext").value.trim();
    if (!rawText) return alert("Upload/Paste data History Koin terlebih dahulu.");
    history = parseHistoryData(rawText);
    hasil = [];
    const userid = document.getElementById("userid").value.trim().split(/\r?\n/).filter(x => x.trim() !== "");
    const nominal = document.getElementById("nominal").value.trim().split(/\r?\n/).filter(x => x.trim() !== "");
    if (userid.length === 0 || userid.length !== nominal.length) return alert("Data UserID dan Nominal harus valid & sama panjang.");
    history.forEach(h => h.used = false);

    for (let i = 0; i < userid.length; i++) {
        const uid = userid[i].trim().toLowerCase();
        const dep = nominal[i].replace(/,/g, "").replace(/\./g, "").trim();
        let ketemu = false, admin = "-", tanggal = "-";
        for (let j = 0; j < history.length; j++) {
            if (!history[j].used && history[j].to.toLowerCase() === uid && history[j].coin === dep && ADMIN.includes((history[j].by || "").trim().toLowerCase())) {
                ketemu = true; admin = history[j].by || "-"; tanggal = history[j].date || "-"; history[j].used = true; break;
            }
        }
        let depCount = ketemu ? getDepositCount(uid, tanggal) : "-";
        hasil.push({ no: i + 1, userid: userid[i].trim(), nominal: dep, status: ketemu ? "MATCH" : "TIDAK MATCH", admin, tanggal, depCount });
    }
    const tbody = document.querySelector("#hasilDepositTable tbody");
    tbody.innerHTML = "";
    hasil.forEach(item => {
        const countVal = parseInt(item.depCount, 10);
        const depBadge = (!isNaN(countVal) && countVal > 3) 
            ? `<span class="depo-high-badge"><i class="fa-solid fa-fire me-1"></i>${item.depCount}</span>` 
            : `<b>${item.depCount}</b>`;

        tbody.innerHTML += `<tr>
            <td>${item.no}</td>
            <td class="fw-bold">${item.userid}</td>
            <td>${Number(item.nominal).toLocaleString("en-US")}</td>
            <td><span class="status-badge ${item.status === "MATCH" ? "benar" : "salah"}">${item.status}</span></td>
            <td>${item.admin}</td>
            <td>${item.tanggal}</td>
            <td>${depBadge}</td>
        </tr>`;
    });
}

function resetDeposit() {
    document.getElementById("userid").value = "";
    document.getElementById("nominal").value = "";
    document.getElementById("historytext").value = "";
    history = []; hasil = [];
    document.querySelector("#hasilDepositTable tbody").innerHTML = "";
    alert("Checker Manual Deposit berhasil di-reset.");
}

function downloadExcelDeposit() {
    if (hasil.length === 0) return alert("Belum ada data.");
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(hasil), "HASIL DEPOSIT");
    XLSX.writeFile(wb, "Hasil_Deposit.xlsx");
}

// CHECKER TO LOGIC
let hasilTOExport = [];
function handleTOHistoryFileUpload(e) { processUploadedFile(e.target.files[0], "historyTO"); }
function handleTODataFileUpload(e) { processUploadedFile(e.target.files[0], "toDataText"); }

function parseHistoryTO(text) {
    let records = [];
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l !== "");
    lines.forEach(line => {
        let parts = line.split(/\t|,/).map(p => p.trim().replace(/^"|"$/g, ""));
        if (parts.length >= 6 && parts[0].toLowerCase() === "date") return;
        if (parts.length >= 6) {
            const date = parts[0], info = parts[1], to = parts[2], by = parts[3], coin = parts[4], lastCoin = parts[5];
            if (/^deposit/i.test(info) && to) records.push({date, info, userid: to.toLowerCase(), by, coin: coin.replace(/,/g, "").replace(/\./g, ""), lastCoin});
        }
    });
    return records;
}

function parseTurnoverData(text) {
    let toMap = {};
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l !== "");
    lines.forEach(line => {
        let parts = line.split(/\t/).map(p => p.trim().replace(/^"|"$/g, ""));
        if (parts.length >= 3) {
            let idPart = parts[0].replace(/^\d+/, '').toLowerCase();
            if (!idPart && parts[1]) idPart = parts[1].toLowerCase();
            if (idPart && !/^(noid|pemain|player)$/i.test(idPart)) toMap[idPart] = {turnover: parts[1] || "", winLose: parts[2] || ""};
        } else {
            let match = line.match(/^(\d+)?([a-zA-Z][a-zA-Z0-9_-]*)[\s,]+([0-9.,]+)[\s,]+(-?[0-9.,]+)/);
            if (match) toMap[match[2].toLowerCase()] = {turnover: match[3], winLose: match[4]};
        }
    });
    return toMap;
}

function prosesTO() {
    const historyVal = document.getElementById("historyTO").value.trim();
    const toVal = document.getElementById("toDataText").value.trim();
    if (!historyVal || !toVal) return alert("Mohon isi History Koin dan Data TO terlebih dahulu!");

    const historyRecords = parseHistoryTO(historyVal);
    const toMap = parseTurnoverData(toVal);
    let htmlHasil = "";
    hasilTOExport = [];

    historyRecords.forEach((item, index) => {
        let u = item.userid;
        let coin = item.coin;
        let toData = toMap[u];
        let turnover = toData ? toData.turnover : "";
        let winLose = toData ? toData.winLose : "";
        let st = toData ? "ADA TO" : "TIDAK ADA TO";
        htmlHasil += `
            <tr>
                <td>${index + 1}</td>
                <td>${item.date || '-'}</td>
                <td><b>${u}</b></td>
                <td>${coin}</td>
                <td>${turnover || '-'}</td>
                <td>${winLose || '-'}</td>
                <td><span class="status-badge ${st === "ADA TO" ? "benar" : "salah"}">${st}</span></td>
            </tr>`;
        hasilTOExport.push({"No":index+1,"Tanggal & Jam":item.date||"","UserID":u,"Coin":coin,"TurnOver":turnover||"0","WinLose":winLose||"0","Status":st});
    });

    document.getElementById("hasilTOBody").innerHTML = htmlHasil;
}

function resetTO() {
    document.getElementById("historyTO").value = "";
    document.getElementById("toDataText").value = "";
    document.getElementById("hasilTOBody").innerHTML = "";
    alert("Checker Deposit VS Turnover berhasil di-reset.");
}

function downloadExcelTO() {
    if (hasilTOExport.length === 0) return alert("Belum ada data.");
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(hasilTOExport), "HASIL TO");
    XLSX.writeFile(wb, "Hasil_TO.xlsx");
}

// PENGECEKAN BONUS MAHJONG LOGIC
let hasilBonusExport = [];

function prosesDataMassal() {
    const rawText = document.getElementById('textPasteAll').value.trim();
    if (!rawText) return alert('Paste data Excel terlebih dahulu!');
    
    const tbody = document.getElementById('tbodyMassal');
    tbody.innerHTML = '';
    hasilBonusExport = [];

    const lines = rawText.split(/\r?\n/).filter(l => l.trim() !== '');
    let parsedData = [];
    let userCounts = {};

    // Proses 1: Memilah kolom agar presisi & Hitung jumlah duplikat
    lines.forEach(line => {
        // Coba pisahkan dengan tab terlebih dahulu (paling stabil dari Excel)
        let cols = line.split('\t');
        
        // Jika kolom hasil tab kurang dari 6, kemungkinan di-paste dengan spasi
        if (cols.length < 6) {
            cols = line.split(/\s{2,}/); // Pecah berdasarkan 2 spasi atau lebih
        }
        
        // Jika masih gagal, coba koma
        if (cols.length < 6) {
            cols = line.split(',');
        }

        cols = cols.map(c => c.trim().replace(/^"|"$/g, ''));

        // Jika terdeteksi minimal 8 kolom (sesuai contoh data)
        if (cols.length >= 8) {
            parsedData.push(cols);
            
            // Hitung duplikasi User ID
            let uid = cols[0].toLowerCase();
            userCounts[uid] = (userCounts[uid] || 0) + 1;
        }
    });

    if (parsedData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="11" class="empty-table-placeholder">
            <i class="fa-solid fa-triangle-exclamation"></i>
            <div>Gagal mendeteksi kolom. Pastikan format tabel sesuai.</div>
        </td></tr>`;
        return;
    }

    // Proses 2: Cetak ke dalam Tabel dengan Logika Highlighting
    parsedData.forEach((cols, index) => {
        let uid = cols[0].toLowerCase();
        let count = userCounts[uid];
        let isHigh = count > 3; // Jika data lebih dari 3
        
        const tr = document.createElement('tr');
        
        // Tambahkan class khusus jika lebih dari 3
        if (isHigh) {
            tr.classList.add('row-highlight');
        }

        let statusHtml = isHigh 
            ? '<span class="status-badge salah">Lebih dari 3</span>' 
            : '<span class="status-badge benar">Sesuai</span>';

        tr.innerHTML = `
            <td>${index + 1}</td>
            <td><b>${cols[0] || '-'}</b></td>
            <td>${cols[1] || '-'}</td>
            <td>${cols[2] || '-'}</td>
            <td>${cols[3] || '-'}</td>
            <td><code>${cols[4] || '-'}</code></td>
            <td>${cols[5] || '0'}</td>
            <td>${cols[6] || '0'}</td>
            <td>${cols[7] || '0'}</td>
            <td>${cols[7] || '0'}</td>
            <td>${statusHtml}</td>
        `;
        tbody.appendChild(tr);

        hasilBonusExport.push({
            "No": index + 1,
            "User ID": cols[0] || '-',
            "Nama Rek": cols[1] || '-',
            "No Rekening": cols[2] || '-',
            "Permainan": cols[3] || '-',
            "Kode Ticket": cols[4] || '-',
            "Total Win": cols[5] || '0',
            "Taruhan": cols[6] || '0',
            "Bonus Dibagi": cols[7] || '0',
            "Bonus Harusnya": cols[7] || '0',
            "Status": isHigh ? "Lebih dari 3" : "Sesuai"
        });
    });
}

function resetBonus() {
    document.getElementById("textPasteAll").value = "";
    hasilBonusExport = [];
    document.getElementById("tbodyMassal").innerHTML = '<tr><td colspan="11" class="empty-table-placeholder">Belum ada data diproses.</td></tr>';
    alert("Bonus mahong berhasil di-reset.");
}

function downloadExcelBonus() {
    if (hasilBonusExport.length === 0) return alert("Belum ada data.");
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(hasilBonusExport), "HASIL BONUS");
    XLSX.writeFile(wb, "Hasil_Bonus.xlsx");
}

// RECONCILIATION LOGIC
let reconResults = [];
function reconNormalizeUserID(v) { return String(v || "").trim().toLowerCase(); }

function reconNormalizeNominal(v) {
    if (!v) return null;
    let text = String(v).trim().replace(/\s/g, "").replace(/,/g, "").replace(/\./g, "");
    const n = parseInt(text, 10);
    return isNaN(n) ? null : n;
}

function reconFormatNominal(v) {
    if (v === null || v === undefined || isNaN(v) || v === 0) return "0";
    return Number(v).toLocaleString("en-US");
}

function reconMakeKey(u, n) { return reconNormalizeUserID(u) + "|" + n; }

function reconParseManualData(text) {
    const data = [];
    if (!text) return data;
    for (const line of text.split(/\r?\n/).map(x => x.trim()).filter(Boolean)) {
        let tokens = line.split(/\s+/).filter(Boolean);
        if (tokens.length < 2) continue;
        
        let nominal = null;
        let userid = tokens[0];
        
        let lastClean = tokens[tokens.length - 1].replace(/,/g, "").replace(/\./g, "");
        if (/^\d+$/.test(lastClean)) {
            nominal = parseInt(lastClean, 10);
        } else {
            for (let i = tokens.length - 1; i >= 1; i--) {
                let clean = tokens[i].replace(/,/g, "").replace(/\./g, "");
                if (/^\d{3,9}$/.test(clean)) {
                    nominal = parseInt(clean, 10);
                    break;
                }
            }
        }
        
        if (userid && nominal !== null && !isNaN(nominal)) {
            data.push({userid: reconNormalizeUserID(userid), nominal});
        }
    }
    return data;
}

function reconParseExcelData(text) {
    const data = [];
    for (const line of text.split(/\r?\n/).filter(x => x.trim())) {
        let columns = line.split("\t");
        if (columns.length < 5) columns = line.split(/\s{2,}/);
        if (columns[0] && columns[0].toLowerCase().includes("tanggal")) continue;
        const tanggal = columns[0] || "", detail = columns[3] || "", to = columns[4] || "";
        let userid = "";
        const userMatch = detail.match(/\(([^()]+)\)/);
        if (userMatch) userid = userMatch[1].trim();
        if (to.trim()) userid = to.trim();
        const nominalMatch = detail.match(/deposit\s+([\d.,]+)/i);
        if (!nominalMatch) continue;
        const nominal = reconNormalizeNominal(nominalMatch[1]);
        if (userid && nominal !== null) data.push({tanggal, userid: reconNormalizeUserID(userid), nominal, detail});
    }
    return data;
}

function reconParseSlotData(text) {
    const data = [];
    for (const line of text.split(/\r?\n/).filter(x => x.trim())) {
        let columns = line.split("\t");
        if (columns.length < 2) columns = line.split(/\s{2,}/);
        if (columns.length < 2) continue;
        const userid = columns[0].trim();
        let percentIndex = -1;
        for (let i = 0; i < columns.length; i++) {
            if (String(columns[i]).includes("%")) { percentIndex = i; break; }
        }
        if (percentIndex === -1) continue;
        let bonus = null;
        for (let i = columns.length - 1; i > percentIndex; i--) {
            if (!columns[i].trim()) continue;
            const parsed = reconNormalizeNominal(columns[i].trim());
            if (parsed !== null) { bonus = parsed; break; }
        }
        if (userid && bonus !== null) data.push({userid: reconNormalizeUserID(userid), bonus});
    }
    return data;
}

function prosesReconciliation() {
    const manualText = document.getElementById("reconManualData").value;
    const inputManualText = document.getElementById("reconInputManualData").value;
    const excelText = document.getElementById("reconExcelData").value;
    const slotText = document.getElementById("reconSlotData").value;

    if (!excelText.trim()) return alert("Data Excel Deposit masih kosong.");

    const manualMahjongData = reconParseManualData(manualText);
    const manualInputData = reconParseManualData(inputManualText);
    const excelData = reconParseExcelData(excelText);
    const slotData = reconParseSlotData(slotText);

    if (!excelData.length) return alert("Data Excel Deposit tidak berhasil dibaca. Pastikan format data sesuai.");

    const mahjongCounter = {};
    manualMahjongData.forEach(item => {
        const key = reconMakeKey(item.userid, item.nominal);
        mahjongCounter[key] = (mahjongCounter[key] || 0) + 1;
    });

    const manualCounter = {};
    manualInputData.forEach(item => {
        const key = reconMakeKey(item.userid, item.nominal);
        manualCounter[key] = (manualCounter[key] || 0) + 1;
    });

    const slotByUser = {};
    slotData.forEach(item => {
        if (!slotByUser[item.userid]) slotByUser[item.userid] = [];
        slotByUser[item.userid].push(item.bonus);
    });

    let depositBalance = 0, depositNotBalance = 0, slotBalance = 0, slotNotBalance = 0;
    reconResults = [];

    excelData.forEach(item => {
        const key = reconMakeKey(item.userid, item.nominal);

        let bonusMahjong = 0;
        if (mahjongCounter[key] && mahjongCounter[key] > 0) {
            bonusMahjong = item.nominal;
            mahjongCounter[key]--;
        }

        let dataManual = 0;
        if (manualCounter[key] && manualCounter[key] > 0) {
            dataManual = item.nominal;
            manualCounter[key]--;
        }

        const isDepoBalanced = (bonusMahjong > 0) || (dataManual > 0);
        const statusDeposit = isDepoBalanced ? "BALANCE" : "TIDAK COCOK";

        if (isDepoBalanced) depositBalance++; else depositNotBalance++;

        const userSlots = slotByUser[item.userid] || [];
        const bonusSlot = userSlots.reduce((sum, value) => sum + value, 0);
        const statusSlot = bonusSlot > 0 ? "BALANCE" : "TIDAK COCOK";
        if (bonusSlot > 0) slotBalance++; else slotNotBalance++;

        reconResults.push({
            ...item,
            bonusMahjong,
            dataManual,
            statusDeposit,
            bonusSlot,
            statusSlot
        });
    });

    document.getElementById("reconTotalDeposit").innerText = excelData.length;
    document.getElementById("reconDepositBalance").innerText = depositBalance;
    document.getElementById("reconDepositNotBalance").innerText = depositNotBalance;
    document.getElementById("reconSlotBalance").innerText = slotBalance;
    document.getElementById("reconSlotNotBalance").innerText = slotNotBalance;

    const tbody = document.getElementById("reconResultBody");
    tbody.innerHTML = "";
    reconResults.forEach((item, index) => {
        const tr = document.createElement("tr");
        const depStatus = item.statusDeposit === "BALANCE"
            ? '<span class="status-badge benar">🟢 BALANCE</span>'
            : '<span class="status-badge salah">🔴 TIDAK COCOK</span>';
        const slotStatus = item.statusSlot === "BALANCE"
            ? '<span class="status-badge benar">🟢 BALANCE</span>'
            : '<span class="status-badge salah">🔴 TIDAK COCOK</span>';

        tr.innerHTML = `
            <td>${index + 1}</td>
            <td>${item.tanggal}</td>
            <td><b>${item.userid}</b></td>
            <td>${reconFormatNominal(item.nominal)}</td>
            <td>${reconFormatNominal(item.bonusMahjong)}</td>
            <td>${reconFormatNominal(item.dataManual)}</td>
            <td>${reconFormatNominal(item.bonusSlot)}</td>
            <td class="text-start">${item.detail}</td>
            <td>${depStatus}</td>
            <td>${slotStatus}</td>`;
        tbody.appendChild(tr);
    });
}

function resetReconciliation() {
    ["reconManualData","reconInputManualData","reconExcelData","reconSlotData"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = "";
    });
    reconResults = [];
    ["reconTotalDeposit","reconDepositBalance","reconDepositNotBalance","reconSlotBalance","reconSlotNotBalance"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerText = "0";
    });
    document.getElementById("reconResultBody").innerHTML = '<tr><td colspan="10" class="empty-table-placeholder"><i class="fa-solid fa-box-archive"></i><div>Belum ada data diproses.</div></td></tr>';
    alert("Pengecekan Deposit Balance berhasil di-reset.");
