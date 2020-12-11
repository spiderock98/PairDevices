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

// define the number of bytes you want to access
#define EEPROM_SIZE 100
bool flagEnCam = false;

#if TEST
// #define STASSID "HTC"
// #define STAPSK "chitam1234"
// bApb0Ypwg5YszGanWOBKre39zlg1
// #define UID "bApb0Ypwg5YszGanWOBKre39zlg1"
// #define NODENAME "vuon xoai"
#define HOST "192.168.2.128" // HOME local ip
#define PORT 81
#define LED_BUILTIN 33
#define FLASH_BUILTIN 4
#else
#define STASSID "taikhoan"
#define STAPSK "matkhau"
// bApb0Ypwg5YszGanWOBKre39zlg1
#define UID "dinhdanh"
#define NODENAME "physicalId"
#define HOST "192.168.2.129" // HOME local ip
#define PORT 81
#define LED_BUILTIN 33
#define FLASH_BUILTIN 4
#endif

// const char *ssid = STASSID;
// const char *password = STAPSK;
// const char *uid = UID;
String finalUID = "";
// const char *nodename = NODENAME;

String jsonOut;
void webSocketEventHandle(WStype_t type, uint8_t *payload, size_t length);
// void checkReProgram();
void Task2Func(void *pvParameters);
// TaskHandle_t Task1;
TaskHandle_t Task2;

// StaticJsonDocument<200> docParser;

uint8_t currWtlv = 0, preWtlv = 0;

void setup()
{
  Serial1.begin(9600, SERIAL_8N1, 13, 12); // zigbee RX TX
  Serial.begin(115200);
  Serial.setDebugOutput(true);
  EEPROM.begin(EEPROM_SIZE);
  Wire.begin(15, 14); // i2c water level SDA SCK

  pinMode(LED_BUILTIN, OUTPUT);
  pinMode(FLASH_BUILTIN, OUTPUT);
  pinMode(0, INPUT_PULLUP);
  pinMode(16, INPUT); // interrupt water level

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
  // WiFi.begin(ssid, password);
  // WiFi.setAutoConnect(true);
  // WiFi.reconnect();
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

  // uint8_t idxTimeOutInit = 1;
  // // 20s timeout
  // while ((WiFi.status() != WL_CONNECTED) && (idxTimeOutInit < 100))
  // {
  //   digitalWrite(LED_BUILTIN, 1);
  //   delay(100);
  //   digitalWrite(LED_BUILTIN, 0);
  //   delay(100);
  //   ++idxTimeOutInit;
  // }
  //   if (WiFi.status() != WL_CONNECTED)
  //   {
  //     digitalWrite(FLASH_BUILTIN, 1);
  //     delay(1000);
  //     digitalWrite(FLASH_BUILTIN, 0);
  //     digitalWrite(LED_BUILTIN, 0);
  // #if DEBUG
  //     Serial.println("Cannot connect to this wifi network\nRestarting ...");
  // #endif
  //     ESP.restart(); // return
  //   }

  //! if cannot connect to any wifi network then program will be stuck here
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
    // checkReProgram();

#if DEBUG
    Serial.print(" ... 2");
#endif
    digitalWrite(FLASH_BUILTIN, 1);
    delay(25);
    digitalWrite(FLASH_BUILTIN, 0);
    delay(100);
    // checkReProgram();

#if DEBUG
    Serial.print(" ... 1");
#endif
    digitalWrite(FLASH_BUILTIN, 1);
    delay(25);
    digitalWrite(FLASH_BUILTIN, 0);
    delay(100);
    // checkReProgram();

#if DEBUG
    Serial.println(" ... 0");
#endif
    digitalWrite(FLASH_BUILTIN, 1);
    delay(25);
    digitalWrite(FLASH_BUILTIN, 0);
    delay(109);
    // checkReProgram();

    //!  if agree then enter Pairing Mode
    //     if (!digitalRead(0))
    //     {
    //       delay(20);
    //       if (!digitalRead(0))
    //       {
    //         EEPROM.write(0, 0);
    //         EEPROM.commit();

    //         digitalWrite(FLASH_BUILTIN, 1);
    //         delay(20);
    //         digitalWrite(FLASH_BUILTIN, 0);
    //         delay(20);
    //         digitalWrite(FLASH_BUILTIN, 1);
    //         delay(20);
    //         digitalWrite(FLASH_BUILTIN, 0);

    // #if DEBUG
    //         Serial.println("[ESP] BUTTON PRESSED >> EEPROM value at addr 0 is cleared");
    //         Serial.println("[ESP] Resetting ESP ... !!!");
    // #endif
    //         ESP.restart(); // return
    //       }
    //     }

    //! if EEP value at addr 0 is 1 && not hold button >> send camera is ready
    param1["EVENT"] = "espEnCamera";
#if DEBUG
    Serial.println("Sending <espEnCamera> EVENT");
#endif
  }

  //! else if EEPROM value at addr no.0 is 0 then enter pairing mode WITHOUT asking
  else
  {
    param1["EVENT"] = "regESP";
  }

  param1["MAC"] = WiFi.macAddress();
  param1["IP"] = WiFi.localIP().toString();
  param1["SSID"] = WiFi.SSID();
  param1["PSK"] = WiFi.psk();
  param1["UID"] = finalUID;
  serializeJson(doc, jsonOut);

  webSocket.begin(HOST, PORT, "/"); // server address, port and URL

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
      // config.jpeg_quality = 40;
      config.jpeg_quality = 62;
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
      webSocket.sendTXT("[{\"EVENT\":\"std\",\"detail\":\"[Error] Init Camera\"}]");
#if DEBUG
      Serial.printf("Camera init failed with error 0x%x", err);
#endif
      return;
    }
    else
      webSocket.sendTXT("[{\"EVENT\":\"std\",\"detail\":\"[Success] Init Camera\"}]");
  }

  //!================/ WebSocket Config /================!//
  // webSocket.begin(HOST, PORT, "/"); // server address, port and URL
  webSocket.onEvent(webSocketEventHandle);
}

void loop()
{
  //! polling gpio16 INT
  // TODO: if interrupt when websocket not ready thì sao
  if (!digitalRead(16))
  {
    Wire.beginTransmission(PCF);
    Wire.write(0xFF); // have to write this >> Totem Pole
    Wire.endTransmission();
    Wire.requestFrom(PCF, 1); // 1 byte
    while (Wire.available())
    {
      currWtlv = Wire.read();
      if (currWtlv - preWtlv)
      {
        switch (currWtlv)
        {
          // low
        case 0b11111111:
          // webSocket.sendTXT("[{\"EVENT\":\"wtlv\",\"uId\":\"" + finalUID + "\",\"gId\":\"" + WiFi.macAddress() + "\",\"val\":30}]");
          //todo: testing
          webSocket.sendTXT("[{\"EVENT\":\"wtlv\",\"val\":30}]");
          break;

          // medium
        case 0b01111111:
          // webSocket.sendTXT("[{\"EVENT\":\"wtlv\",\"uId\":\"" + finalUID + "\",\"gId\":\"" + WiFi.macAddress() + "\",\"val\":60}]");
          //todo: testing
          webSocket.sendTXT("[{\"EVENT\":\"wtlv\",\"val\":60}]");
          break;

          // high
        case 0b00111111:
          // webSocket.sendTXT("[{\"EVENT\":\"wtlv\",\"uId\":\"" + finalUID + "\",\"gId\":\"" + WiFi.macAddress() + "\",\"val\":90}]");
          //todo: testing
          webSocket.sendTXT("[{\"EVENT\":\"wtlv\",\"val\":90}]");
          break;
        }
        preWtlv = currWtlv;
      }
    }
  }

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
    webSocket.sendBIN(fb->buf, fb->len); // send message to server when Connected

    esp_camera_fb_return(fb);
  }

  //!================= Zigbee OnEvent ==================!//
  if (Serial1.available())
  {
    String recvZigbee = Serial1.readStringUntil('\n');
    // Serial.println(recvZigbee);

    StaticJsonDocument<200> docParser;
    deserializeJson(docParser, recvZigbee);
    // #if DEBUG
    //     Serial.println(recvZigbee);
    // #endif

    String slaveId = docParser["id"];
    String recvEvent = docParser["ev"];

    if (recvEvent == "lgH")
    {
      webSocket.sendTXT("[{\"EVENT\":\"lgH\",\"dvId\":\"" + slaveId + "\",\"val\":" + docParser["val"].as<String>() + "}]");
    }
    else if (recvEvent == "lgT")
    {
      webSocket.sendTXT("[{\"EVENT\":\"lgT\",\"dvId\":\"" + slaveId + "\",\"val\":" + docParser["val"].as<String>() + "}]");
    }
    else if (recvEvent == "lgG")
    {
      webSocket.sendTXT("[{\"EVENT\":\"lgG\",\"dvId\":\"" + slaveId + "\",\"val\":" + docParser["val"].as<String>() + "}]");
    }
    else if (recvEvent == "mns")
    {
      webSocket.sendTXT("[{\"EVENT\":\"mns\",\"dvId\":\"" + slaveId + "\",\"val\":" + docParser["val"].as<bool>() + "}]");
    }
    else if (recvEvent == "thrOK")
    {
      webSocket.sendTXT("[{\"EVENT\":\"thrOK\"}]");
    }
    else if (recvEvent == "ckstOK")
    {
      webSocket.sendTXT("[{\"EVENT\":\"ckstOK\",\"dvId\":\"" + slaveId + "\"}]");
    }
    else if (recvEvent == "delGar")
    {
      webSocket.sendTXT("[{\"EVENT\":\"delGar\",\"dvId\":\"" + slaveId + "\"}]");
    }
    else if (recvEvent == "inOK")
    {
      webSocket.sendTXT("[{\"EVENT\":\"inOK\"}]");
#if DEBUG
      Serial.println("[INFO] " + slaveId + " complete pairing new device");
#endif
    }
  }
  webSocket.loop();
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
    //! on event add new gardens
    if (Serial.available())
    {
      String recvTTL = Serial.readStringUntil('\n');
      StaticJsonDocument<200> docParser;
      deserializeJson(docParser, recvTTL);

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

      //       if (docParser["ev"] == "newGarden")
      //       {
      //         String ttlUID = docParser["uid"];
      //         const char *ttlSSID = docParser["ssid"];
      //         const char *ttlPsk = docParser["psk"];

      //         WiFi.disconnect();
      //         WiFi.begin(ttlSSID, ttlPsk);
      //         uint8_t idxTimeOutPair = 1;
      //         // 10s timeout
      //         while ((WiFi.status() != WL_CONNECTED) && (idxTimeOutPair < 26))
      //         {
      //           digitalWrite(LED_BUILTIN, 1);
      //           delay(100);
      //           digitalWrite(LED_BUILTIN, 0);
      //           delay(100);
      //           ++idxTimeOutPair;
      //         }
      //         if (WiFi.status() == WL_CONNECTED)
      //         {
      //           digitalWrite(FLASH_BUILTIN, 1);
      //           delay(1000);

      //           uint8_t ptrEEPROM = 2;
      //           // addr 0 is flagExist, addr 1 is size of ssid
      //           for (int i = 0; ttlSSID[i] != NULL; ++i)
      //           {
      //             EEPROM.write(ptrEEPROM, ttlSSID[i]);
      //             EEPROM.commit();
      //             ++ptrEEPROM;
      //           }
      //           // write size of ssid
      //           EEPROM.write(1, ptrEEPROM - 2);
      //           EEPROM.commit();

      //           // leave a position for password size
      //           uint8_t posSizePsk = ptrEEPROM++;

      //           for (int i = 0; ttlPsk[i] != NULL; ++i)
      //           {
      //             EEPROM.write(ptrEEPROM, ttlPsk[i]);
      //             EEPROM.commit();
      //             ++ptrEEPROM;
      //           }
      //           // write size of ssid
      //           EEPROM.write(posSizePsk, ptrEEPROM - 1 - posSizePsk);
      //           EEPROM.commit();

      // #if DEBUG
      //           Serial.print("\nWiFi connected");
      //           Serial.println(WiFi.localIP());
      // #endif
      //           EEPROM.write(0, 0);
      //           EEPROM.commit();
      // #if DEBUG
      //           Serial.println("[ESP] RE-PROGRAM THIS ESP >> EEPROM value at addr 0 is cleared");
      //           Serial.println("[ESP] Resetting ESP ... !!!");
      // #endif
      //           ESP.restart(); // return
      //         }
      //         else
      //         {
      //           // ack stderr
      //           Serial.println("WrongSSIDPsk");
      //         }
      //       }
    }
  }
}

//!================/ Func Define /================!//
void webSocketEventHandle(WStype_t type, uint8_t *payload, size_t length)
{
  switch (type)
  {
  case WStype_PING:
    // pong will be send automatically
    // Serial.printf("[WSc] get ping\n");
    break;

  case WStype_DISCONNECTED:
#if DEBUG
    Serial.printf("[WSc] Disconnected from %s:%s\n", HOST, PORT);
#endif
    digitalWrite(LED_BUILTIN, 1);
    break;

  case WStype_CONNECTED:
#if DEBUG
    Serial.printf("[WSc] Connected to url: %s\n", payload);
#endif
    //? ====/ send message to server when Connected /==== ?//
    // [{"EVENT":"espEnCamera","MAC":"24:6F:28:B0:B5:10","IP":"192.168.1.3","SSID":"VIETTEL","PSK":"Sherlock21vtag","UID":"bApb0Ypwg5YszGanWOBKre39zlg1"}]
    webSocket.sendTXT(jsonOut);

    break;

    //!===============/ socket ON recieve data /================!//
  case WStype_TEXT:
    // Serial.printf("[WSc] %s\n", payload);
#if DEBUG
#endif

    // forward all message to all slave
    Serial1.printf("%s\n", payload);

    StaticJsonDocument<1024> recvDoc;
    DeserializationError error = deserializeJson(recvDoc, payload, length);
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
      String eventName = recvDoc["ev"];

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

      //       else if (eventName == "regDV")
      //       {
      // #if DEBUG
      //         Serial.println("[INFO] New QR Device Detected");
      //         Serial.println("[INFO] Ready to send ack confirm via UART1 Zigbee");
      // #endif
      //         String initDvAddr = recvDoc["initDvAddr"];
      //         // sending init json string
      //         Serial1.println("{\"id\":\"" + initDvAddr + "\",\"ev\":\"init\"}");
      //       }
    }

    //? Fetch values.
    // char json[] = "{\"sensor\":\"gps\",\"time\":1351824120,\"data\":[48.756080,2.302038]}";
    // Most of the time, you can rely on the implicit casts.
    // In other case, you can do doc["time"].as<long>();
    // const char *sensor = recvDoc["sensor"];
    // long time = recvDoc["time"];
    // double latitude = recvDoc["data"][0];
    // double longitude = recvDoc["data"][1];

    break;
  }
}

// void checkReProgram()
// {
//   if (Serial.readStringUntil('\n') == "clearEEPROM")
//   {
//     digitalWrite(FLASH_BUILTIN, 1);
//     EEPROM.write(0, 0);
//     EEPROM.commit();
// #if DEBUG
//     Serial.println("[ESP] RE-PROGRAM THIS ESP >> EEPROM value at addr 0 is cleared");
//     Serial.println("[ESP] Resetting ESP ... !!!");
// #endif
//     ESP.restart(); // return
//   }
// }