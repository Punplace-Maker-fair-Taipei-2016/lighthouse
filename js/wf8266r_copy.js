var callbacks = [];
var callbackEvent;

var GPIO = {
    ip: null,
    websocketClose:false,
    websocket: false,
    connection: null,
    init: function (myIP, isWS) {
        if (myIP != null) {
            GPIO.ip = myIP;
            if (isWS == null)
                isWS = true;
            GPIO.websocket = isWS;
        }
        else {
            GPIO.ip = $("unu-wf8266r").attr("ip");
            var websocket = $("unu-wf8266r").attr("websocket");
            if (websocket != null)
                GPIO.websocket = true;
            else
                GPIO.websocket = false;
        }

        connectWebsocket();

        $("wf8266r-button").each(function (index) {
            var button = $(this);
            this.pin = button.attr('pin');
            this.type = button.attr('type');
            this.value = button.attr('value');
            this.delay = button.attr('delay') == null ? 0 : button.attr('delay');
            this.id = button.attr('id') == null ? 0 : button.attr('id');
            this.watch = button.attr('watch') == null ? 1000 : button.attr('watch');
            this.title = button.text();

            //console.log(index + " " + this.pin + " " + this.type + " " + this.value + " " + this.delay + " " + this.id + " " + this.watch);

            switch (this.type) {
                case "pwm":
                    button.html("<span>" + this.title + "</span> <input type='range' pin='" + this.pin + "' apiType='" + this.type + "' delay='"
                    + this.delay + "' min='0' max='1023' value='"
                    + this.value + "' step='1' onchange=\"GPIO.toggle(this, this.value, '" + this.id + "')\"/><span id='"+this.id+"_value'>" + this.value + "</span>");
                    break;
                case "adc":
                    button.html("<button watchid='"+this.id+"' class='realTime' pin='0' apiType='adc' value=''>" + this.title + "<span id='" + this.id + "_value'>" +this.value + "</button>");
                    setInterval(function () { GPIO.toggle(button.html(), 0) }, this.watch);
                    break;
                case "read":
                    button.html("<button watchid='" + this.id + "' class='realTime' pin='" + this.pin + "' apiType='read' value='"+this.value+"'>" + this.title + "<span id='" + this.id + "_value'>" + this.value + "</span></button>");
                    setInterval(function () { GPIO.toggle(button.html(), 0) }, this.watch);
                    break;
                case "servo":
                    button.html("<span>" + this.title + "</span> <input type='range' pin='" + this.pin + "' apiType='" + this.type + "' delay='"
                    + this.delay + "' min='10' max='170' value='"
                    + this.value + "' step='1' onchange=\"GPIO.toggle(this, this.value, '" + this.id + "')\"/><span id='" + this.id + "_value'>" + this.value + "</span>");
                    break;
                default:
                    button.html("<button type='button' pin='" + this.pin
                        + "' apiType='" + this.type + "' value='" + this.value + "' delay='" + this.delay + "' onclick='GPIO.toggle(this)'>" + this.title + "</button>");
                    break;
            }
        });
    
    },
    pin: function (n, value, callback) {
        this.togglePin("gpio", n, value, callback);
    },
    pwm: function (n, value, callback) {
        this.togglePin("gpio/pwm", n, value, callback);
    },
    adc: function (callback) {
        this.togglePin("gpio/adc", "0", "", callback);
    },
    read: function (n, value, callback) {
        this.togglePin("gpio/read", n, value, callback);
    },
    adcWrite: function (value, callback) {
        this.togglePin("gpio/adcWrite", 0, value, callback);
    },
    dht11: function (n, callback) {
        this.togglePin("dht11", n, "", callback);
    },
    dht: function (pin, type, callback) {
        this.togglePin("dht", "pin", pin, callback, "type", type);
    },
    distance: function(echo, trig, callback){
        this.togglePin("distance", "echo", echo, callback, "trig", trig);
    },
    light: function (callback) {
        this.togglePin("light", "", "", callback);
    },
    serialBaud: function (value, callback) {
        this.togglePin("serial", "baud", value, callback);
    },
    serialRead: function (type, callback) {
        this.togglePin("serial/read", type, "", callback);
    },
    serialWrite: function (value, type, callback) {
        this.togglePin("serial/write", type, value, callback);
    },
    serialWriteln: function (value, type, callback) {
        this.togglePin("serial/writeln", type, value, callback);
    },
    servo: function (pin, degree, callback) {
        this.togglePin("servo", "pin", pin, callback, "degree", degree);
    },
    pir: function (pin, callback) {
        this.togglePin("pir", "pin", pin, callback);
    },
    pm25: function (pin, callback) {
        this.togglePin("pm25", "pin", pin, callback);
    },
    ds: function (pin, callback) {
        this.togglePin("ds", "pin", pin, callback);
    },
    ds: function (pin, index, callback) {
        this.togglePin("ds", "pin", pin, callback, "index", index);
    },
    events: function (callback) {
        callbackEvent = callback;
    },
    getApiUri: function (type) {
        var apiType;
        switch (type) {
            case "gpio": apiType = "gpio"; break;
            case "pwm": apiType = "gpio/pwm"; break;
            case "adc": apiType = "gpio/adc"; break;
            case "read": apiType = "gpio/read"; break;
            case "servo": apiType = "servo"; break;
            default: apiType = "gpio"; break;
        }

        return apiType;
    },
    toggle: function (button, newValue, id) {  
        if(id==null)
            id = $(button).attr("watchid");
        var pin = $(button).attr("pin");
        var type = $(button).attr("apiType");
        var value = $(button).attr("value");
        var apiType = this.getApiUri(type);
        
        if (type == "pwm" || type == "servo") {
            value = newValue;
            $("#" + id+"_value").text(newValue);
        }

        if (GPIO.websocket)
        {
            GPIO.webSocket_toggle(apiType, pin, value, type, id);
        }
        else
        {
            GPIO.webAPI_toggle(apiType, pin, value, type, id);
        }
    },
    webAPI_toggle: function (apiType, pin, value, type, id) {
        var uri = "";
        if (apiType == "servo")
            uri = "http://" + GPIO.ip + "/" + apiType + "?pin=" + pin + "&degree=" + value;
        else if(apiType == "gpio/read")
            uri = "http://" + GPIO.ip + "/" + apiType + "?pinmode="+value+"&"+pin+"=";
        else
            uri = "http://" + GPIO.ip + "/" + apiType + "?" + pin + "=" + value;

        $.ajaxSetup({ timeout: 1000 });
        $.getJSON(uri,
        function (data) {
            if (type == "adc") {
                $("#" + id + "_value").text(data);
                var event_adc = new CustomEvent('wf8266r-adcMessage', { 'detail': data });
                document.dispatchEvent(event_adc);
            }
            if (type == "read") {
                $("#" + id + "_value").text(data[pin]);
                var event_read = new CustomEvent('wf8266r-readMessage', { 'detail': data });
                document.dispatchEvent(event_read);
            }
        })
        .fail(
        function (xhr, textStatus, err) {
            //console.log(xhr);
        });
    },
    webSocket_toggle: function (apiType, pin, value, type, id) {
        GPIO.connection.send(apiType + ',' + pin + '=' + value);
        var callbackEvent = { controlID:id+"_value", pin:pin, type:type};
        callbacks.push(callbackEvent);
    },
    togglePin: function (type, pin, value, callback, pin2, value2) {
        if (GPIO.websocket)
            GPIO.webSocket_togglePin(type, pin, value, callback, pin2, value2);
        else
            GPIO.webAPI_togglePin(type, pin, value, callback, pin2, value2);
    },
    webAPI_togglePin: function (type, pin, value, callback, pin2, value2) {
        
        var uri = "http://" + GPIO.ip + "/" + type + "?" + pin + "=" + value;

        if (type == "gpio/read")
            uri = "http://" + GPIO.ip + "/" + type + "?pinmode=" + value + "&" + pin + "=";

        if (pin2 != null)
            uri += "&" + pin2 + "=" + value2;

        $.ajaxSetup({ timeout: 10000 });
        $.getJSON(uri,
        function (data) {
            if (callback != null)
                callback(data);
        })
        .fail(
        function (xhr, textStatus, err) {
            if (callback != null)
                callback(xhr.responseText);
        });
    },
    webSocket_togglePin: function (type, pin, value, callback, pin2, value2) {
        var uri = type + ',' + pin + '=' + value;
        if (pin2 != null)
            uri += "&" + pin2 + "=" + value2;

        if (!GPIO.websocketClose) {
            GPIO.connection.send(uri);
            var callbackEvent = { type: type, pin: pin, value: value, callback: callback, pin2: pin2, value2: value2 };
            callbacks.push(callbackEvent);
        }
    }
}


function connectWebsocket() {
    GPIO.connection = new WebSocket('ws://' + GPIO.ip + ':81/api', ['wf8266r']);
    GPIO.connection.onopen = function () {
        GPIO.websocketClose = false;
        var event_ready = new CustomEvent('wf8266r-ready', { 'detail': GPIO.ip });
        document.dispatchEvent(event_ready);
    };

    GPIO.connection.onerror = function (error) {
        console.log('WebSocket Error ', error);
        $("body").append("<span>連線失敗, 請檢查連線設定</span>");
    };

    GPIO.connection.onclose = function (e) {
        GPIO.websocketClose = true;
        setTimeout(function () {
            connectWebsocket();
        }, 5000);
    };

    GPIO.connection.onmessage = function (e) {
        var json = $.parseJSON(e.data.substring(0, e.data.length - 1));
        if (json.Type != null) {
            callbackEvent(json);
            return;
        }

        // Web API Process
        var index = callbacks.length;
        var event = callbacks[0];
        callbacks.splice(0, 1);
        if (event.controlID == null)
            event.callback(json);
        else {
            var data = "";
            if (event.type == "adc") {
                data = json.ADC;
                var event_adc = new CustomEvent('wf8266r-adcMessage', { 'detail': data });
                document.dispatchEvent(event_adc);
            }
            if (event.type == "read") {
                data = json['D'+event.pin];
                var event_read = new CustomEvent('wf8266r-readMessage', { 'detail': json });
                document.dispatchEvent(event_read);
            }
            if (event.type == "pwm")
                data = json['D' + event.pin];

            $("#" + event.controlID).text(data);
        }
    };
}
