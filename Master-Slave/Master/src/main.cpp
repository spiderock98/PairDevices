#define VERSION 2
#define DEBUG false
#define TEST true
#define FLASH false

#include <Arduino.h>
#include <EEPROM.h>
#include <WiFi.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include "esp_camera.h"
#define CAMERA_MODEL_AI_THINKER
#define PCF 0x38 // address PCF8574A
#if TEST
#include "camera_pins.h"
#else
#include "include/camera_pins.h"
#endif

WebSocketsClient webSocket;
WebSocketsClient webSocketCam;

#define EEPROM_SIZE 100 // define the number of bytes you want to access
bool flagEnCam = false;

#define HOST "115.76.144.9"
// #define HOST "192.168.43.145"
#define PORT 81
#define LED_BUILTIN 33
#define FLASH_BUILTIN 4

String finalUID = "";

String jsonOut;
void webSocketEventHandle(WStype_t type, uint8_t *payload, size_t length);
void webSocketCamEventHandle(WStype_t type, uint8_t *payload, size_t length);
void Task2Func(void *pvParameters);
// TaskHandle_t Task1;
TaskHandle_t Task2;

StaticJsonDocument<200> docParser;

uint8_t currWtlv = 0,
        preWtlv = 0;
uint32_t nowWdCam = 0;
uint32_t nowPCF = 0;

// uint32_t pongDogSocketData = 50000;
// uint32_t pongDogSocketData = 15;
// uint32_t pongDogSocketCamera = 70000;
// bool isWsDataAlive = false;
// bool isWsCamAlive = false;

void setup()
{
  Serial1.begin(9600, SERIAL_8N1, 13, 12); // zigbee RX TX
  Serial.begin(115200);
  Serial.setDebugOutput(true);
  EEPROM.begin(EEPROM_SIZE);
  Wire.begin(14, 15); // i2c water level SDA SCK

  // #ifdef VERSION == 1
  //   Wire.begin(15, 14); // i2c water level SDA SCK
  // #elif VERSION == 2
  // Wire.begin(14, 15); // i2c water level SDA SCK
  // #endif

  pinMode(LED_BUILTIN, OUTPUT);
  pinMode(FLASH_BUILTIN, OUTPUT);
  // pinMode(0, INPUT_PULLUP);
  pinMode(0, INPUT); // interrupt water level

  //!create a task that will be executed in the TaskxFunc() function, with priority 1 and executed on core x
  // xTaskCreatePinnedToCore(
  //     Task1Func,   /* Task function. */
  //     "Task1Func", /* name of task. */
  //     10000,       /* Stack size of task */
  //     NULL,        /* parameter of the task */
  //     1,           /* priority of the task */
  //     &Task1,      /* Task handle to keep track of created task */
  //     0);          /* pin task to core 0 */
  // delay(500);
  xTaskCreatePinnedToCore(
      Task2Func,   /* Task function. */
      "Task2Func", /* name of task. */
      10000,       /* Stack size of task */
      NULL,        /* parameter of the task */
      1,           /* priority of the task */
      &Task2,      /* Task handle to keep track of created task */
      1);          /* pin task to core 0 */
  delay(500);

  //!================/ Internet Config /================!//
  String finalSSID = "";
  uint8_t sizeSSID = EEPROM.read(1);
  for (int i = 2; sizeSSID--; i++)
  {
    finalSSID += char(EEPROM.read(i));
  }
  char arrSSID[EEPROM.read(1) + 1];
  finalSSID.toCharArray(arrSSID, EEPROM.read(1) + 1);

  String finalPsk = "";
  uint8_t sizePsk = EEPROM.read(2 + EEPROM.read(1));
  for (int i = 3 + EEPROM.read(1); sizePsk--; i++)
  {
    finalPsk += char(EEPROM.read(i));
  }
  char arrPsk[EEPROM.read(2 + EEPROM.read(1)) + 1];
  finalPsk.toCharArray(arrPsk, EEPROM.read(2 + EEPROM.read(1)) + 1);

  uint8_t sizeUID = EEPROM.read(3 + EEPROM.read(1) + EEPROM.read(2 + EEPROM.read(1)));
  for (int i = 4 + EEPROM.read(1) + EEPROM.read(2 + EEPROM.read(1)); sizeUID--; i++)
  {
    finalUID += char(EEPROM.read(i));
  }
  char arrUID[EEPROM.read(3 + EEPROM.read(1) + EEPROM.read(2 + EEPROM.read(1))) + 1];
  finalUID.toCharArray(arrUID, EEPROM.read(3 + EEPROM.read(1) + EEPROM.read(2 + EEPROM.read(1))) + 1);

#if DEBUG
  Serial.println(finalSSID);
  Serial.println(finalPsk);
  Serial.println(finalUID);
#endif

  WiFi.begin(arrSSID, arrPsk);

  //? if cannot connect to any wifi network then program will be stuck here
  while (WiFi.status() != WL_CONNECTED)
  {
    digitalWrite(LED_BUILTIN, 1);
    delay(100);
    digitalWrite(LED_BUILTIN, 0);
    delay(100);
  }

#if DEBUG
  Serial.println("\nWiFi connected");
  Serial.println(WiFi.localIP());
#endif
  //!================/ Init JSON Garden Infomation /================!//
  DynamicJsonDocument doc(1024);
  JsonArray array = doc.to<JsonArray>();
  // array.add("regEsp");
  JsonObject param1 = array.createNestedObject(); // add payload (parameters) for the event

#if DEBUG
  Serial.print("Current EEPROM[0]: ");
  Serial.println(EEPROM.read(0));
#endif

  //!====/ Pairing Mode /====!//
  // EEPROM addr no.0 is 1 when devices is DONE-PAIRING
  if (EEPROM.read(0) == 1)
  {
#if DEBUG
    Serial.print("if you want to re-pair, please HOLD button in ... 3");
#endif
    digitalWrite(FLASH_BUILTIN, 1);
    delay(25);
    digitalWrite(FLASH_BUILTIN, 0);
    delay(100);

#if DEBUG
    Serial.print(" ... 2");
#endif
    digitalWrite(FLASH_BUILTIN, 1);
    delay(25);
    digitalWrite(FLASH_BUILTIN, 0);
    delay(100);

#if DEBUG
    Serial.print(" ... 1");
#endif
    digitalWrite(FLASH_BUILTIN, 1);
    delay(25);
    digitalWrite(FLASH_BUILTIN, 0);
    delay(100);

#if DEBUG
    Serial.println(" ... 0");
#endif
    digitalWrite(FLASH_BUILTIN, 1);
    delay(25);
    digitalWrite(FLASH_BUILTIN, 0);
    delay(109);

    //! if EEP value at addr 0 is 1 && not hold button >> send camera is ready
    param1["ev"] = "espEnCamera";
#if DEBUG
    Serial.println("Sending <espEnCamera> event");
#endif
  }
  //! else if EEPROM value at addr no.0 is 0 then enter pairing mode WITHOUT asking
  else
  {
    param1["ev"] = "regESP";
  }

  param1["MAC"] = WiFi.macAddress();
  param1["IP"] = WiFi.localIP().toString();
  param1["SSID"] = WiFi.SSID();
  param1["PSK"] = WiFi.psk();
  param1["UID"] = finalUID;
  serializeJson(doc, jsonOut);

  //!================/ WebSocket Config /================!//
  webSocket.begin(HOST, PORT, "/"); // server address, port and URL
  webSocket.onEvent(webSocketEventHandle);
  delay(2000);                       // delay for DATA socket go first then CAMERA socket
  webSocketCam.begin(HOST, 82, "/"); // server address, port and URL
  webSocketCam.onEvent(webSocketCamEventHandle);

  //!================/ AI-Thinker Camera Config /================!//
  if (EEPROM.read(0) == 1)
  {
    camera_config_t config;
    config.ledc_channel = LEDC_CHANNEL_0;
    config.ledc_timer = LEDC_TIMER_0;
    config.pin_d0 = Y2_GPIO_NUM;
    config.pin_d1 = Y3_GPIO_NUM;
    config.pin_d2 = Y4_GPIO_NUM;
    config.pin_d3 = Y5_GPIO_NUM;
    config.pin_d4 = Y6_GPIO_NUM;
    config.pin_d5 = Y7_GPIO_NUM;
    config.pin_d6 = Y8_GPIO_NUM;
    config.pin_d7 = Y9_GPIO_NUM;
    config.pin_xclk = XCLK_GPIO_NUM;
    config.pin_pclk = PCLK_GPIO_NUM;
    config.pin_vsync = VSYNC_GPIO_NUM;
    config.pin_href = HREF_GPIO_NUM;
    config.pin_sscb_sda = SIOD_GPIO_NUM;
    config.pin_sscb_scl = SIOC_GPIO_NUM;
    config.pin_pwdn = PWDN_GPIO_NUM;
    config.pin_reset = RESET_GPIO_NUM;
    config.xclk_freq_hz = 20000000;
    config.pixel_format = PIXFORMAT_JPEG;
    // init with high specs to pre-allocate larger buffers
    if (psramFound())
    {
      // change format and quality here
      // config.frame_size = FRAMESIZE_VGA;
      config.frame_size = FRAMESIZE_CIF;
      // config.frame_size = FRAMESIZE_QCIF;

      config.jpeg_quality = 40;
      // config.jpeg_quality = 62;
      config.fb_count = 2;
    }
    else
    {
      config.frame_size = FRAMESIZE_SVGA;
      config.jpeg_quality = 12;
      config.fb_count = 1;
    }
    // camera init
    esp_err_t err = esp_camera_init(&config);
    if (err != ESP_OK)
    {
      // webSocket.sendTXT("[{\"ev\":\"std\",\"detail\":\"[Error] Init Camera\"}]");
#if DEBUG
      Serial.printf("Camera init failed with error 0x%x", err);
#endif
      return;
    }
    // else
    // webSocket.sendTXT("[{\"ev\":\"std\",\"detail\":\"[Success] Init Camera\"}]");
  }
}

void loop()
{
  //!================/ send CAMERA stream to server /=================!//
  if (flagEnCam)
  {
    camera_fb_t *fb = esp_camera_fb_get();
    if (!fb)
    {
#if DEBUG
      Serial.println("[INFO] Capture failed");
#endif
      esp_camera_fb_return(fb);
      return;
    }
    if (fb->format != PIXFORMAT_JPEG)
    {
#if DEBUG
      Serial.println("[INFO] None-JPEG data");
#endif
      return;
    }
    webSocketCam.sendBIN(fb->buf, fb->len); // send message to server when Connected

    esp_camera_fb_return(fb);
  }

  webSocketCam.loop();
  //todo testing
  // if (!(--pongDogSocketCamera))
  // {
  //   ESP.restart();
  // }
}

//!================/ FreeRTOS Tasks Func /================!//
void Task2Func(void *pvParameters)
{
#if DEBUG
  Serial.print("Task2 is running on core ");
  Serial.println(xPortGetCoreID());
#endif
  while (1)
  {
    //todo testing
    // if (!(--pongDogSocketData))
    // {
    //   ESP.restart();
    // }
    // else
    // {
    //   Serial.println(pongDogSocketData);
    // }

    // if (millis() - nowWdCam > 1000)
    // {
    //   if (!(--pongDogSocketData))
    //   {
    //     ESP.restart();
    //   }
    //   nowWdCam = millis();
    // }

    webSocket.loop();

    //!=========/ polling gpio16 INT /========!//
    // todo: if interrupt when websocket not ready thì sao
    // Serial.println(analogRead(4));

    if (!digitalRead(0) && (millis() - nowPCF > 1000))
    // if (analogRead(4) < 2482) // 2V
    {
      // digitalWrite(FLASH_BUILTIN,1);
      Wire.beginTransmission(PCF);
      Wire.write(0xFF); // have to write this >> Totem Pole
      Wire.endTransmission();
      Wire.requestFrom(PCF, 1); // 1 byte
      while (Wire.available())
      {
        currWtlv = Wire.read();
        // Serial.println(currWtlv, BIN);
        if (currWtlv - preWtlv)
        {
          switch (currWtlv)
          {
            // low
          case 0b11111111:
            // digitalWrite(FLASH_BUILTIN, 1);
            webSocket.sendTXT("[{\"ev\":\"wtlv\",\"val\":10}]");
            break;

            // medium
          case 0b01111111:
            // digitalWrite(FLASH_BUILTIN, 0);
            webSocket.sendTXT("[{\"ev\":\"wtlv\",\"val\":40}]");
            break;

            // high
          case 0b00111111:
            // digitalWrite(FLASH_BUILTIN, 1);
            webSocket.sendTXT("[{\"ev\":\"wtlv\",\"val\":70}]");
            break;

            // ultra high
          case 0b00011111:
            // digitalWrite(FLASH_BUILTIN, 0);
            webSocket.sendTXT("[{\"ev\":\"wtlv\",\"val\":100}]");
            break;
          }
          preWtlv = currWtlv;
        }
      }

      nowPCF = millis();
    }

    //!================= Zigbee OnEvent ==================!//
    if (Serial1.available())
    {
      DeserializationError error = deserializeJson(docParser, Serial1);
      if (error)
      {
#if DEBUG
        Serial.print(F("deserializeJson() failed: "));
        Serial.println(error.c_str());
#endif
      }
      else
      {
        String slaveId = docParser["id"];
        String recvEvent = docParser["ev"];

        if (recvEvent == "lgH")
        {
          webSocket.sendTXT("[{\"ev\":\"lgH\",\"dvId\":\"" + slaveId + "\",\"val\":" + docParser["val"].as<String>() + "}]");
        }
        else if (recvEvent == "lgT")
        {
          webSocket.sendTXT("[{\"ev\":\"lgT\",\"dvId\":\"" + slaveId + "\",\"val\":" + docParser["val"].as<String>() + "}]");
        }
        else if (recvEvent == "lgG")
        {
          webSocket.sendTXT("[{\"ev\":\"lgG\",\"dvId\":\"" + slaveId + "\",\"val\":" + docParser["val"].as<String>() + "}]");
        }
        else if (recvEvent == "mns")
        {
          webSocket.sendTXT("[{\"ev\":\"mns\",\"dvId\":\"" + slaveId + "\",\"val\":" + docParser["val"].as<bool>() + "}]");
        }
        else if (recvEvent == "thrOK")
        {
          webSocket.sendTXT("[{\"ev\":\"thrOK\"}]");
        }
        else if (recvEvent == "ckstOK")
        {
          webSocket.sendTXT("[{\"ev\":\"ckstOK\",\"dvId\":\"" + slaveId + "\"}]");
        }
        else if (recvEvent == "delGar")
        {
          webSocket.sendTXT("[{\"ev\":\"delGar\",\"dvId\":\"" + slaveId + "\"}]");
        }
        else if (recvEvent == "inOK")
        {
          webSocket.sendTXT("[{\"ev\":\"inOK\"}]");
#if DEBUG
          Serial.println("[INFO] " + slaveId + " complete pairing new device");
#endif
        }
      }
    }

    //!========= on event add new gardens via TTL USB ========!//
    if (Serial.available())
    {
      // String recvTTL = Serial.readStringUntil('\n');
      // StaticJsonDocument<200> docParser;
      DeserializationError error = deserializeJson(docParser, Serial);
      if (error)
      {
#if DEBUG
        Serial.print(F("deserializeJson() failed: "));
        Serial.println(error.c_str());
#endif
      }
      else
      {
        if (docParser["ev"] == "newGarden")
        {
          const char *ttlUID = docParser["uid"];
          const char *ttlSSID = docParser["ssid"];
          const char *ttlPsk = docParser["psk"];

          digitalWrite(FLASH_BUILTIN, 1);
          delay(1000);

          uint8_t ptrEEPROM = 2;
          // addr 0 is flagExist, addr 1 is size of ssid
          for (int i = 0; ttlSSID[i] != NULL; ++i)
          {
            EEPROM.write(ptrEEPROM, ttlSSID[i]);
            EEPROM.commit();
            ++ptrEEPROM;
          }
          // write size of ssid
          EEPROM.write(1, ptrEEPROM - 2);
          EEPROM.commit();

          // leave a position for password size
          uint8_t posSizePsk = ptrEEPROM++;

          for (int i = 0; ttlPsk[i] != NULL; ++i)
          {
            EEPROM.write(ptrEEPROM, ttlPsk[i]);
            EEPROM.commit();
            ++ptrEEPROM;
          }
          // write size of password
          EEPROM.write(posSizePsk, ptrEEPROM - 1 - posSizePsk);
          EEPROM.commit();

          // leave a position for UID size
          uint8_t posSizeUID = ptrEEPROM++;

          for (int i = 0; ttlUID[i] != NULL; ++i)
          {
            EEPROM.write(ptrEEPROM, ttlUID[i]);
            EEPROM.commit();
            ++ptrEEPROM;
          }
          // write size of uid
          EEPROM.write(posSizeUID, ptrEEPROM - 1 - posSizeUID);
          EEPROM.commit();

          // clear this garden slave
          EEPROM.write(0, 0);
          EEPROM.commit();

          digitalWrite(FLASH_BUILTIN, 0);
          ESP.restart(); // return to connect new wifi network in void setup
        }
      }
    }
  }
}

//!================/ port 82 CAMERA Func Define /================!//
void webSocketCamEventHandle(WStype_t type, uint8_t *payload, size_t length)
{
  switch (type)
  {
    //todo testing
  case WStype_PING:
    // if esp got ping >> pong will be send automatically
    // pongDogSocketCamera = 70000;
    break;

  case WStype_DISCONNECTED:
    // isWsCamAlive = false;
    break;

  case WStype_CONNECTED:
    // isWsCamAlive = true;
#if DEBUG
    Serial.printf("[wsCAM] Connected to url: %s\n", payload);
#endif
    webSocketCam.sendTXT(jsonOut);
    digitalWrite(FLASH_BUILTIN, 1);
    delay(1000);
    digitalWrite(FLASH_BUILTIN, 0);
    break;

  case WStype_TEXT:
    //? not use global <docParser> b/c may be duplicate thread use that variable
    StaticJsonDocument<200> docParserCam;
    DeserializationError error = deserializeJson(docParserCam, payload, length);
    if (error)
    {
#if DEBUG
      Serial.print(F("[ERROR] deserializeJson() failed"));
#endif
      return;
    }
    else
    {
      String eventName = docParserCam["ev"];

      if (eventName == "RESTART_ESP")
      {
#if DEBUG
        Serial.println("[INFO] Server request ESP to restart");
#endif
        ESP.restart();
      }
    }
    break;
  }
}

//!================/ port 81 DATA Func Define /================!//
void webSocketEventHandle(WStype_t type, uint8_t *payload, size_t length)
{
  switch (type)
  {
    //todo testing
  case WStype_PING:
    // if esp got ping >> pong will be send automatically
    // pongDogSocketData = 50000;
    break;

  case WStype_DISCONNECTED:
    // isWsDataAlive = false;
#if DEBUG
    Serial.printf("[WSc] Disconnected from %s:%s\n", HOST, PORT);
#endif
    break;

  case WStype_CONNECTED:
    // isWsDataAlive = true;
#if DEBUG
    Serial.printf("[wsDATA] Connected to url: %s\n", payload);
#endif
    //? ====/ send message to server when Connected /==== ?//
    // [{"ev":"espEnCamera","MAC":"24:6F:28:B0:B5:10","IP":"192.168.1.3","SSID":"VIETTEL","PSK":"Sherlock21vtag","UID":"bApb0Ypwg5YszGanWOBKre39zlg1"}]
    webSocket.sendTXT(jsonOut);

    break;

    //!===============/ ON recieve data /================!//
  case WStype_TEXT:
    // Serial.printf("[WSc] %s\n", payload);
#if DEBUG
#endif

    // forward all message to all slave
    Serial1.printf("%s\n", payload);

    // StaticJsonDocument<1024> recvDoc;
    // DeserializationError error = deserializeJson(recvDoc, payload, length);
    DeserializationError error = deserializeJson(docParser, payload, length);
    // Test if parsing success
    if (error)
    {
#if DEBUG
      Serial.print(F("[ERROR] deserializeJson() failed"));
#endif
      return;
    }
    else
    {
      String eventName = docParser["ev"];

      if (eventName == "enC")
      {
        flagEnCam = true;
#if FLASH
        digitalWrite(FLASH_BUILTIN, 1);
#endif
#if DEBUG
        Serial.println("[INFO] START Streaming ...");
#endif
      }

      else if (eventName == "diC")
      {
        flagEnCam = false;
#if FLASH
        digitalWrite(FLASH_BUILTIN, 0);
#endif
#if DEBUG
        Serial.println("[INFO] STOP Streaming ...");
#endif
      }

      else if (eventName == "regESP_OK")
      {
#if DEBUG
        Serial.println("[INFO] ESP Registration Successfully ...");
#endif
        EEPROM.write(0, 1);
        EEPROM.commit();
#if DEBUG
        Serial.println("ESP Restarting ...");
#endif
        // RESET for the next setup()
        ESP.restart();
      }

      else if (eventName == "RESTART_ESP")
      {
#if DEBUG
        Serial.println("[INFO] Server request ESP to restart");
#endif
        ESP.restart();
      }
    }
    break;
  }
}