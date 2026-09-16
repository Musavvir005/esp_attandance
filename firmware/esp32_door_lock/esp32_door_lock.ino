#include <WiFi.h>
#include <HTTPClient.h>
#include <Adafruit_Fingerprint.h>
#include <HardwareSerial.h>
#include <U8g2lib.h>
#include <Wire.h>
#include <time.h>
#include <math.h>

// ================= WiFi =================
// const char* ssid = "FUNLAB";
// const char* password = "JC318srm";
const char* ssid = "srmap-iotlab";
const char* password = "I0T#2o24L@b";

// ================= BACKEND =================
const char* server_url  = "https://esp-attandance.onrender.com/log";
const char* unlock_url  = "https://esp-attandance.onrender.com/check-unlock";

// ================= ROOM =================
// ⚠️  Room identifier (e.g. CRF_LAB_1, ROOM_1, etc.)
const char* DIR_NAME = "CRF_LAB_1";

// ================= PINS =================
#define FP_RX 25
#define FP_TX 26
#define OLED_SCL 18
#define OLED_SDA 19
#define BUZZER_PIN 21
#define RELAY_PIN 15
#define BUTTON_PIN 23

// ================= OBJECTS =================
HardwareSerial fpSerial(1);
Adafruit_Fingerprint finger(&fpSerial);

U8G2_SSD1306_128X64_NONAME_1_HW_I2C u8g2(
  U8G2_R0, U8X8_PIN_NONE, OLED_SCL, OLED_SDA
);

// ================= FUNCTION PROTOTYPES =================
void displayMessage(const char* l1, const char* l2 = "", int d = 0);
// void beepOnce();
// void beepTwice();
void beepOnce(int duration = 100);
void beepTwice(int duration1 = 100, int duration2 = 100);
void beepThrice(int duration1 = 100, int duration2 = 100, int duration3 = 100);
void lockDoor();
void unlockDoor(uint32_t ms);
int findNextAvailableID();
bool scanAndEnroll(int id);
bool isAdmin(int id);
void sendToServer(int id);
void checkUnlock();          // polls backend for remote unlock commands

// ================= SETUP =================
void setup() {
  Serial.begin(115200);
  u8g2.begin();

  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(RELAY_PIN, OUTPUT);
  pinMode(BUTTON_PIN, INPUT_PULLUP);

  lockDoor();

  WiFi.begin(ssid, password);
  displayMessage("Connecting", "WiFi");
  while (WiFi.status() != WL_CONNECTED);

  displayMessage("WiFi Connected", "", 1000);

  configTime(19800, 0, "pool.ntp.org");
  while (time(nullptr) < 100000);

  fpSerial.begin(57600, SERIAL_8N1, FP_RX, FP_TX);
  finger.begin(57600);

  if (!finger.verifyPassword()) {
    displayMessage("FP ERROR", "Check Wiring");
    while (1);
  }

  displayMessage("READY", "SCAN FINGER");
}

// ================= LOOP =================
void loop() {

  // 🔘 BUTTON
  if (digitalRead(BUTTON_PIN) == LOW) {
    beepThrice(100,100,100);
    displayMessage("ACCESS", "GRANTED", 1500);
    unlockDoor(15000);
    displayMessage("READY", "SCAN FINGER");
    while (digitalRead(BUTTON_PIN) == LOW);
    return;
  }

  // 🌐 REMOTE UNLOCK (poll backend every loop iteration)
  checkUnlock();

  if (finger.getImage() != FINGERPRINT_OK) return;
  if (finger.image2Tz() != FINGERPRINT_OK) return;

  // ================= CHECK EXISTING =================
  if (finger.fingerSearch() == FINGERPRINT_OK) {

    int id = finger.fingerID;
    displayMessage("ID FOUND", String(id).c_str(), 1500);   // ← shows the matched ID

    // ===== ADMIN =====
    if (isAdmin(id)) {
      beepOnce(400);
      displayMessage("ADMIN MODE", ("ID: " + String(id)).c_str());   // ← shows which admin ID triggered it
      delay(3000);
      delay(3000);   
      int newID = findNextAvailableID();

      // int newID = findNextAvailableID();

      if (newID < 0) {
        displayMessage("MEMORY FULL", "", 2000);
        return;
      }

      displayMessage("ENROLL ID", String(newID).c_str());

      if (scanAndEnroll(newID)) {
        beepThrice(100,100,100);
        displayMessage("SUCCESS", "", 2000);
      } else {
        beepTwice(150,150);
        displayMessage("FAILED", "", 2000);
      }

      displayMessage("READY", "SCAN FINGER");
      return;
    }

    // ===== USER =====// ===== USER =====
    beepThrice(150,150,150);
    displayMessage("ACCESS GRANTED", ("ID: " + String(id)).c_str(), 1500);   // ← shows which user ID unlocked
    unlockDoor(5000);
    sendToServer(id);
    displayMessage("READY", "SCAN FINGER");
    return;
  }

  // ================= AUTO ENROLL =================
//   int count = finger.templateCount;

//   int newID = findNextAvailableID();

//   if (newID < 0) {
//     displayMessage("MEMORY FULL", "", 2000);
//     return;
//   }

//   if (count < 3) {
//     displayMessage("SET ADMIN", String(newID).c_str());
//   } else {
//     displayMessage("NEW USER", String(newID).c_str());
//   }

//   if (scanAndEnroll(newID)) {
//     beepOnce();
//     displayMessage("ENROLLED", String(newID).c_str(), 2000);
//   } else {
//     beepTwice();
//     displayMessage("FAILED", "", 2000);
//   }

//   displayMessage("READY", "SCAN FINGER");
// }

// ================= UNKNOWN FINGER =================
  // if (finger.templateCount == 0 && digitalRead(BUTTON_PIN) == LOW) {
  //   // First-time setup: no admins exist yet, button confirms physical presence
  //   displayMessage("SETUP MODE", "ADD ADMIN 1");
  //   int newID = findNextAvailableID();
  //   if (scanAndEnroll(newID)) {
  //     beepOnce();
  //     displayMessage("ADMIN ADDED", String(newID).c_str(), 2000);
  //   } else {
  //     beepTwice();
  //     displayMessage("FAILED", "", 2000);
  //   }
  //   displayMessage("READY", "SCAN FINGER");
  //   return;
  // }
  // ================= UNKNOWN FINGER =================
finger.getTemplateCount();  
if (finger.templateCount == 0) {
  // First-time setup: sensor is empty, no admins exist yet
  displayMessage("SETUP MODE", "ADD ADMIN 1");
  int newID = findNextAvailableID();
  if (scanAndEnroll(newID)) {
    beepThrice(100,100,100);
    displayMessage("ADMIN ADDED", String(newID).c_str(), 2000);
  } else {
    beepTwice(150,150);
    displayMessage("FAILED", "", 2000);
  }
  displayMessage("READY", "SCAN FINGER");
  return;
}

// Reject any other unrecognized finger

  // Reject any other unrecognized finger
  beepTwice(200,200);
  displayMessage("ACCESS", "DENIED", 1500);
  displayMessage("READY", "SCAN FINGER");
}   //← this closing brace ends loop(), same as before

// ================= HELPERS =================

// bool isAdmin(int id) {
//   return (id <= 3);  // ✅ first 3 are admins
// }
// ================= ADMIN LIST =================
// #define MAX_ADMINS 20
// int adminIDs[MAX_ADMINS] = {1,2,3};  // ✅ your initial admins — edit this list anytime
// int adminCount = 3;                     // ✅ how many are currently filled in above

// bool isAdmin(int id) {
//   for (int i = 0; i < adminCount; i++) {
//     if (adminIDs[i] == id) return true;
//   }
//   return false;
// }

// int findNextAvailableID() {
//   for (int i = 1; i <= 127; i++) {
//     if (finger.loadModel(i) != FINGERPRINT_OK) return i;
//   }
//   return -1;
// }

// ================= HELPERS =================

// ================= ADMIN LIST =================
#define MAX_ADMINS 20
int adminIDs[MAX_ADMINS] = {1,2,3};
int adminCount = 3;

bool isAdmin(int id) {
  for (int i = 0; i < adminCount; i++) {
    if (adminIDs[i] == id) return true;
  }
  return false;
}

int findNextAvailableID() {
  for (int i = 1; i <= 127; i++) {
    if (finger.loadModel(i) != FINGERPRINT_OK) return i;
  }
  return -1;
}
// ... (rest stays exactly as you have it)

bool scanAndEnroll(int id) {
  int p = -1;

  displayMessage("PLACE FINGER");
  while (p != FINGERPRINT_OK) p = finger.getImage();

  if (finger.image2Tz(1) != FINGERPRINT_OK) return false;

  displayMessage("REMOVE");
  delay(2000);
  while (finger.getImage() != FINGERPRINT_NOFINGER);

  displayMessage("PLACE AGAIN");
  while (finger.getImage() != FINGERPRINT_OK);

  if (finger.image2Tz(2) != FINGERPRINT_OK) return false;
  if (finger.createModel() != FINGERPRINT_OK) return false;
  if (finger.storeModel(id) != FINGERPRINT_OK) return false;

  return true;
}

void lockDoor() {
  digitalWrite(RELAY_PIN, LOW);
}

void unlockDoor(uint32_t ms) {
  digitalWrite(RELAY_PIN, HIGH);
  delay(ms);
  digitalWrite(RELAY_PIN, LOW);
}

// void beepOnce() {
//   digitalWrite(BUZZER_PIN, HIGH);
//   delay(1000);
//   digitalWrite(BUZZER_PIN, LOW);
// }

// void beepTwice() {
//   beepOnce();
//   delay(120);
//   beepOnce();
// }

void beepOnce(int duration) {
  digitalWrite(BUZZER_PIN, HIGH);
  delay(duration);
  digitalWrite(BUZZER_PIN, LOW);
}

void beepTwice(int duration1, int duration2) {
  beepOnce(duration1);
  delay(120);
  beepOnce(duration2);
}

void beepThrice(int duration1, int duration2, int duration3) {   // ← this one is likely missing
  beepOnce(duration1);
  delay(120);
  beepOnce(duration2);
  delay(120);
  beepOnce(duration3);
}

void displayMessage(const char* l1, const char* l2, int d) {
  u8g2.firstPage();
  do {
    u8g2.setFont(u8g2_font_6x12_tf);
    u8g2.drawStr(0, 22, l1);
    if (strlen(l2) > 0) u8g2.drawStr(0, 42, l2);
  } while (u8g2.nextPage());
  if (d > 0) delay(d);
}

// ─── helper: zero-pad a number to 2 digits ───────────────────────────────────
static String pad2(int v) {
  return (v < 10 ? "0" : "") + String(v);
}

void sendToServer(int id) {
  if (WiFi.status() != WL_CONNECTED) return;

  time_t now = time(nullptr);
  struct tm* t = localtime(&now);

  // Build URL matching backend contract:
  // GET /log?id=&date=YYYY-MM-DD&time=HH:MM:SS&dir=
  String url = String(server_url) +
    "?id="   + String(id) +
    "&date=" + String(t->tm_year + 1900) + "-" +
               pad2(t->tm_mon + 1)        + "-" +
               pad2(t->tm_mday) +
    "&time=" + pad2(t->tm_hour) + ":" +
               pad2(t->tm_min)  + ":" +
               pad2(t->tm_sec) +
    "&dir="  + String(DIR_NAME);

  HTTPClient http;
  http.begin(url);
  http.GET();
  http.end();
}

// ─── poll backend for remote unlock command ───────────────────────────────────
void checkUnlock() {
  if (WiFi.status() != WL_CONNECTED) return;

  String url = String(unlock_url) +
    "?dir=" + String(DIR_NAME);

  HTTPClient http;
  http.begin(url);
  int code = http.GET();

  if (code == 200) {
    String body = http.getString();
    body.trim();
    if (body == "true") {
      // Remote unlock requested from admin dashboard
      beepThrice(100, 100, 100);
      displayMessage("REMOTE", "UNLOCK", 500);
      unlockDoor(5000);
      displayMessage("READY", "SCAN FINGER");
    }
  }
  http.end();
}