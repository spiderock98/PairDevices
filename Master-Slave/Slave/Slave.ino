// EEPROM structure [addr 0: this device is blank or not, addr 1:this device still exist in databse or not, addr 10: tThresh, addr 11,12: gThresh, addr 13,14: gThreshOffset, addr15: (0bxxxxxx11)rqModeManual-bit6, currMotor-bit7]

#define DEBUG false
#define VERSION 2

#include <SoftwareSerial.h>
#include <ArduinoJson.h>
#include <EEPROM.h>
#include "DHT.h"

String deviceId = "2B"; // fixed value

#if VERSION == 1
#define misty 5       // phun sương
#define btnClearEEP 7 // xoá eeprom
#define motorGnd 6    // nhỏ giọt
#define buzzer 8      // còi chíp
#define DHTPIN 2      // Đọc dữ liệu từ DHT11 ở trên mạch Arduino
#elif VERSION == 2
#define misty 5       // phun sương
#define btnClearEEP 2 // xoá eeprom
#define motorGnd 6    // nhỏ giọt
#define buzzer 8      // còi chíp
#define DHTPIN 7      // Đọc dữ liệu từ DHT11 ở trên mạch Arduino
#endif
#define DHTTYPE DHT11        // Khai báo loại cảm biến, có 2 loại là DHT11 và DHT22
#define DHT_RATE 3000        // dht sampling rate time [milliseconds]
#define GND_RATE 3000        // earth sensor sampling rate time [milliseconds]
SoftwareSerial zigbee(3, 4); // RX TX

enum blinkTypes
{
  LED,
  BUZZER
};
void blinkNtimes(blinkTypes blType, uint8_t n, uint8_t time);
uint16_t avgGnd(byte n);
void gndAutoHandle(uint16_t gndVal, uint16_t upThresh, uint16_t lowThresh);
void waitRstEEP(uint8_t left);
void EEPROMWriteInt(uint16_t addr, uint16_t value);
int EEPROMReadInt(uint16_t addr);

bool flagExeOnUpdateThrTemp = false, flagExeOnUpdateThrGround = false;
unsigned long nowDHT, nowGnd;
uint8_t countTemp = 0, countHumid = 0;
uint8_t tThresh = EEPROM.read(10);
uint16_t gThresh = EEPROMReadInt(11), gThreshOffset = EEPROMReadInt(13);
float preTemp = 0, currentTemp, preHumid = 0, currentHumid;
uint16_t preGnd = 0, currentGnd;
volatile bool rqModeManual = EEPROM.read(15) & 0b10;
bool currMotor = EEPROM.read(15) & 0b01;
StaticJsonDocument<200> docParser;
DHT dht(DHTPIN, DHTTYPE);

void setup()
{
  pinMode(misty, OUTPUT);
  pinMode(btnClearEEP, INPUT_PULLUP);
  pinMode(motorGnd, OUTPUT);
  digitalWrite(motorGnd, currMotor); // init from eeprom
  pinMode(buzzer, OUTPUT);
  pinMode(LED_BUILTIN, OUTPUT);
  zigbee.begin(9600); // zigbee
  Serial.begin(9600); // debug
  while (!Serial || !zigbee)
    ;
  dht.begin();

#if DEBUG
  if (EEPROM.read(0) == 0)
    Serial.println(deviceId + " is BLANK NEW device");
  else if (EEPROM.read(0) == 1)
    Serial.println(deviceId + " has been registered");
#endif

  // if this device has been registered
  if (EEPROM.read(0))
  {
    for (uint8_t i = 3; i--;)
    {
      blinkNtimes(LED, 1, 50);
      blinkNtimes(BUZZER, 1, 50);
      waitRstEEP(i);
    }
  }

  unsigned long preDelGar = millis();
  while (!EEPROM.read(0))
  {
    // if this device is still alive in database then request to delete it every 2 seconds
    if ((EEPROM.read(1) != 0) && (millis() - preDelGar > 2000))
    {
      zigbee.println("{\"id\":\"" + deviceId + "\",\"ev\":\"delGar\"}");
#if DEBUG
      Serial.println("[INFO] Trying to RE-DELGARDEN ...");
#endif
      preDelGar = millis();
    }
    digitalWrite(LED_BUILTIN, 1);
    // this is new device >> waiting for pairing via zigbee
    if (zigbee.available())
    {
      //       String strRecv = zigbee.readStringUntil('\n');
      // #if DEBUG
      //       Serial.println(strRecv);
      // #endif
      //       DeserializationError error = deserializeJson(docParser, strRecv);
      DeserializationError error = deserializeJson(docParser, zigbee);
      if (error)
      {
#if DEBUG
        Serial.print(F("deserializeJson() failed: "));
        Serial.println(error.c_str());
        // Serial.println("Re-Init this device");
#endif
        blinkNtimes(LED, 1, 1000);
        blinkNtimes(LED, 1, 20);
      }
      else
      {
        if (docParser["id"] == deviceId && docParser["ev"] == "init")
        {
          zigbee.println("{\"id\":\"" + deviceId + "\",\"ev\":\"inOK\"}");
          EEPROM.write(0, 1);
          EEPROM.write(1, 1);
          digitalWrite(LED_BUILTIN, 0);
          blinkNtimes(BUZZER, 1, 1500);
#if DEBUG
          Serial.print("[Success] complete pairing new device");
#endif
        }
        else if (docParser["id"] == deviceId && docParser["ev"] == "delGarOK")
        {
#if DEBUG
          Serial.println("[INFO] This device not in database anymore");
#endif
          blinkNtimes(BUZZER, 4, 100);
          EEPROM.write(1, 0); // this device not in database anymore
        }
      }
    }
  }

  nowDHT = nowGnd = millis();
}

void loop()
{
  //!======/ scan zigbee buffer /======!//
  if (zigbee.available())
  {
    //     String strRecv = zigbee.readStringUntil('\n');
    // #if DEBUG
    //     Serial.println(strRecv);
    // #endif
    //     DeserializationError error = deserializeJson(docParser, strRecv);

    DeserializationError error = deserializeJson(docParser, zigbee);

    if (error)
    {
#if DEBUG
      Serial.print(F("deserializeJson() failed: "));
      Serial.println(error.c_str());
#endif
    }
    else
    {
      // compare if mactching the id
      if (docParser["id"] == deviceId)
      {
        String recvEvName = docParser["ev"];

        if (recvEvName == "isM")
        {
          zigbee.println("{\"id\":\"" + deviceId + "\",\"ev\":\"thrOK\"}");
          rqModeManual = docParser["st"];
          EEPROM.write(15, rqModeManual ? (0b10 | EEPROM.read(15)) : (0b01 & EEPROM.read(15)));
#if DEBUG
          String recvMode = rqModeManual ? "True" : "False";
          Serial.println("[INFO] rqModeManual: " + recvMode);
#endif
        }

        else if (rqModeManual && (recvEvName == "mn"))
        {
          zigbee.println("{\"id\":\"" + deviceId + "\",\"ev\":\"thrOK\"}");

          if (docParser["st"])
          {
            digitalWrite(motorGnd, 1);
            currMotor = 1;
            EEPROM.write(15, EEPROM.read(15) | 0b01);
#if DEBUG
            Serial.println("[Manual_ing] BAT");
#endif
          }
          else
          {
            digitalWrite(motorGnd, 0);
            currMotor = 0;
            EEPROM.write(15, EEPROM.read(15) & 0b10);
#if DEBUG
            Serial.println("[Manual_ing] TAT");
#endif
          }
        }

        else if (recvEvName == "thrT")
        {
          zigbee.println("{\"id\":\"" + deviceId + "\",\"ev\":\"thrOK\"}");
          uint8_t recvT = docParser["t"];
          // uint8_t recvH = docParser["h"];
          // uint8_t cSum = docParser["cs"];
          // String type = docParser["type"];

          // if (cSum == (recvT + recvH))
          // {
          tThresh = recvT;
          // hThresh = recvH;
          flagExeOnUpdateThrTemp = true;
          EEPROM.write(10, tThresh);
          blinkNtimes(BUZZER, 2, 100);
#if DEBUG
          Serial.print("Temp threshold updated: ");
          Serial.println(tThresh);
#endif
          // }
        }
        else if (recvEvName == "thrG")
        {
          uint16_t recvG = docParser["g"];
          uint16_t recvOfs = docParser["ofs"];
          uint16_t cSum = docParser["cs"];

          if (cSum == (recvG + recvOfs))
          {
            zigbee.println("{\"id\":\"" + deviceId + "\",\"ev\":\"thrOK\"}");
            gThresh = recvG;
            gThreshOffset = recvOfs;
            flagExeOnUpdateThrGround = true;
            EEPROMWriteInt(11, gThresh);
            EEPROMWriteInt(13, gThreshOffset);
            blinkNtimes(BUZZER, 3, 75);
#if DEBUG
            Serial.print("Ground threshold updated: ");
            Serial.println(gThresh);
#endif
          }
        }

        else if (recvEvName == "ckst")
        {
          // pong back
          zigbee.println("{\"id\":\"" + deviceId + "\",\"ev\":\"ckstOK\"}");

          blinkNtimes(BUZZER, 2, 100);
          blinkNtimes(BUZZER, 1, 3500);
        }

        else if (recvEvName == "dDV")
        {
#if DEBUG
          Serial.println("Clearing EEPROM at addr 0 and Trying delete database");
#endif
          EEPROM.write(0, 0);
          blinkNtimes(BUZZER, 1, 2000);
#if DEBUG
          Serial.println("Reseting ...");
#endif
          asm volatile("jmp 0"); // reset arduino
        }
      }
    }
  }

  //!======/  Ground Humid Feild /======!//
  if (millis() - nowGnd > GND_RATE)
  {
    currentGnd = avgGnd(1);
    if ((preGnd - currentGnd) || flagExeOnUpdateThrGround)
    {
      zigbee.println("{\"id\":\"" + deviceId + "\",\"ev\":\"lgG\",\"val\":\"" + String(currentGnd) + "\"}");

      if (!rqModeManual)
      {
        gndAutoHandle(currentGnd, gThresh + gThreshOffset, gThresh - gThreshOffset);
      }

      preGnd = currentGnd;
      flagExeOnUpdateThrGround = false;
#if DEBUG
      Serial.print("currentGnd: ");
      Serial.println(currentGnd);
#endif
    }
    nowGnd = millis();
  }

  //!===========/  DHT Sensor Field /============!//
  if (millis() - nowDHT > DHT_RATE)
  {
    currentTemp = dht.readTemperature();
    currentHumid = dht.readHumidity();
    if (!isnan(currentTemp) && !isnan(currentHumid))
    {
      if ((preTemp - currentTemp) || flagExeOnUpdateThrTemp)
      {
        preTemp = currentTemp; // update
        flagExeOnUpdateThrTemp = false;
        //!======/ check DHT temp to handle DC motorGnd every 1 sec /======!//
        if (currentTemp >= tThresh)
        {
          byte out = 150 + ((currentTemp - tThresh) * 8); // maximum outside temp: 45,
          analogWrite(misty, map(out, 0, 255, 0, 106));

#if DEBUG
          Serial.print("currentTemp: ");
          Serial.println(currentTemp);
          Serial.print("out: ");
          Serial.println(out);
#endif
        }
        else
        {
          // analogWrite(misty, 0);
          digitalWrite(misty, 0);
#if DEBUG
          Serial.println("out: 0");
#endif
        }

        //!======/ send dht temperature sensor to server every 3 sec /======!//
        if (++countTemp >= 1)
        {
          zigbee.println("{\"id\":\"" + deviceId + "\",\"ev\":\"lgT\",\"val\":\"" + String(currentTemp) + "\"}");

#if DEBUG
          Serial.print("sTemp: ");
          Serial.println(currentTemp);
#endif
          countTemp = 0;
        }
      }

      if (preHumid - currentHumid)
      {
        preHumid = currentHumid; // update
        //!======/ send dht humid sensor to server every 5 sec /======!//
        if (++countHumid >= 5)
        {
          zigbee.println("{\"id\":\"" + deviceId + "\",\"ev\":\"lgH\",\"val\":\"" + String(currentHumid) + "\"}");
#if DEBUG
          Serial.print("sHumid: ");
          Serial.println(currentHumid);
#endif
          countHumid = 0;
        }
      }
    }
    else
    {
#if DEBUG
      Serial.println("[DHT11] Check your wire connection");
#endif
    }
    nowDHT = millis();
  }
}

void blinkNtimes(blinkTypes blType, uint8_t n, uint8_t time)
{
  switch (blType)
  {
  case LED:
    for (uint8_t i = n; i--;)
    {
      digitalWrite(LED_BUILTIN, 1);
      delay(time);
      digitalWrite(LED_BUILTIN, 0);
      delay(time);
    }
    break;

  case BUZZER:
    for (uint8_t i = n; i--;)
    {
      digitalWrite(buzzer, 1);
      delay(time);
      digitalWrite(buzzer, 0);
      delay(time);
    }
    break;
  }
}

uint16_t avgGnd(byte n)
{
  uint16_t sum;
  for (byte i = n; i--;)
  {
    sum += analogRead(A1);
  }
  return (sum / n);
}

void gndAutoHandle(uint16_t gndVal, uint16_t upThresh, uint16_t lowThresh)
{
  if ((currMotor == 0) && (gndVal > upThresh))
  {
    zigbee.println("{\"id\":\"" + deviceId + "\",\"ev\":\"mns\",\"val\":1}");
    digitalWrite(motorGnd, 1);
    currMotor = 1;
    EEPROM.write(15, EEPROM.read(15) | 0b01);
#if DEBUG
    Serial.println("[Thresh]: BAT");
#endif
  }
  else if ((currMotor == 1) && (gndVal < lowThresh))
  {
    zigbee.println("{\"id\":\"" + deviceId + "\",\"ev\":\"mns\",\"val\":0}");
    digitalWrite(motorGnd, 0);
    currMotor = 0;
    EEPROM.write(15, EEPROM.read(15) & 0b10);
#if DEBUG
    Serial.println("[Thresh]: TAT");
#endif
  }
}

void waitRstEEP(uint8_t left)
{
#if DEBUG
  Serial.print("press RST button to reset this slave in ");
  Serial.println(left);
#endif
  if (!digitalRead(btnClearEEP))
  {
    delay(20);
    if (!digitalRead(btnClearEEP))
    {
#if DEBUG
      Serial.println("Clearing EEPROM at addr 0 and Trying delete database");
#endif
      EEPROM.write(0, 0);
      blinkNtimes(BUZZER, 1, 2000);
#if DEBUG
      Serial.println("Reseting ...");
#endif
      asm volatile("jmp 0"); // reset arduino
    }
  }
}

void EEPROMWriteInt(uint16_t addr, uint16_t value)
{
  uint8_t lsb = (value & 0xFF);
  uint8_t msb = ((value >> 8) & 0xFF);

  EEPROM.write(addr, lsb);
  EEPROM.write(addr + 1, msb);
}

int EEPROMReadInt(uint16_t addr)
{
  uint8_t lsb = EEPROM.read(addr);
  uint8_t msb = EEPROM.read(addr + 1);

  return ((lsb << 0) & 0xFFFFFF) + ((msb << 8) & 0xFFFFFFFF);
  //return (msb << 8) | lsb;
}