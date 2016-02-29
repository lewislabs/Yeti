var https = require('https');
var fs = require('fs');

// This module exposes the functions necessary to call the betfair api 
var apiMethods = {
    listEvents : "listEventTypes"
};
//---------Data Types---------------
///EventTypes
export class EventType {
    name : string;
    id : string;
    marketCount : number;
}

export class GetEventTypesData {
    eventTypes : EventType[];
    constructor(){
        this.eventTypes = new Array<EventType>();
    }
    
}

//---------Callback types-----------
export interface BetfairCallback<T> {
    (success : boolean, data : T) : void
}

interface BetfairLoggingCallback extends BetfairCallback<any> {}
export interface GetEventTypesCallback extends BetfairCallback<GetEventTypesData> {}

//---------IBetfairService----------- 
export interface IBetfairService {
    isLoggedIn() : boolean;
    login(callback : BetfairLoggingCallback) : void;
    getEventTypes(callback : GetEventTypesCallback) : void;
}

// private implementation of IBetfairService
class BetfairApiRequestHeaders {
    private _applicationKey: string;
    private _authToken: string;
    constructor(applicationKey: string) {
        this._applicationKey = applicationKey;
    }
    
    get applicationKey() : string{
        return this._applicationKey;
    }

    set authToken(token: string) {
        this._authToken = token;
    }
    
    get authToken(){
        return this._authToken;
    }

    getHeaders(): any {
        return {
            'X-Application': this._applicationKey,
            'X-Authentication': this._authToken,
            'content-type': 'application/json'
        };
    }
} 

interface ResponseDataExtractor<TCallbackData>{
    (data : string) : TCallbackData;
}

class BetfairService implements IBetfairService {
    private _loggedIn : boolean;
    private _headers : BetfairApiRequestHeaders;
    private _username : string;
    private _password : string;
    private _betfairApi : string = "api.betfair.com";
    constructor(applicationKey : string, username : string, password : string) {
        this._loggedIn = false;
        this._headers = new BetfairApiRequestHeaders(applicationKey);
        this._username = username;
        this._password = password;
    }
    //IBetfairService implementation
    isLoggedIn() {
        return this._loggedIn; 
    }
    
    login(callback : BetfairLoggingCallback) : void {
        if (this._loggedIn) return callback(true, null);
        var payload = 'username=' + this._username + '&password=' + this._password;
        var options = {
            host: 'identitysso.betfair.com',
            path: '/api/certlogin',
            method: 'POST',
            headers: { 'X-Application': this._headers.applicationKey, 'Content-Type': 'application/x-www-form-urlencoded' },
            key: fs.readFileSync('betfair_api.key'),
            cert: fs.readFileSync('betfair_api.crt')
        }
        var req = https.request(options, (res)=> {
            if (res.statusCode != 200) {
                return callback(false, null);
            }
            res.setEncoding('utf8');
            res.on('data', (d) => {
                var json = JSON.parse(d);
                console.info('Betfair login result ' + json.loginStatus);
                if (json.loginStatus == "SUCCESS") {
                    this._loggedIn = true;
                    this._headers.authToken = json.sessionToken;
                    return this.keepAlive(callback);
                }
                return callback(false, null);
            });
        });
        req.on('error', (e)=>{
            console.log(e);
            return callback(false, null);
        })
        req.write(payload);
        req.end();
    }
    
    getEventTypes(callback : GetEventTypesCallback) : void {
        var params = {"filter": {}}
        return this.makeRequest<GetEventTypesData>(apiMethods.listEvents, params, callback,<GetEventTypesData>(data: string)=>{ 
            var json = JSON.parse(data);
            var eventTypes = new GetEventTypesData();
            json.result.forEach(function(element){
                var ev = new EventType();
                ev.marketCount = element.marketCount;
                ev.name = element.eventType.name;
                ev.id  = element.eventType.id;
                this.eventTypes.push(ev);
            }, eventTypes);
            return eventTypes;
        });
    }
    //Private methods 
    private makeRequest<TCallbackData>(apiMethod: string, params: any, callback: BetfairCallback<TCallbackData>, dataExtractor : ResponseDataExtractor<TCallbackData>) : void {
        if (!this._loggedIn) return callback(false, null);
        var req = https.request({
            host: this._betfairApi,
            path: "/exchange/betting/json-rpc/v1",
            method: 'POST',
            headers: this._headers.getHeaders()
        }, (res) => {
            if (res.statusCode != 200) {
                console.warn("Failed to make request to Method=" + apiMethod + " with params=" + params + " statusCode=" + res.statusCode)
                return callback(false, null);
            }
            res.setEncoding('utf8');
            var returnData = '';
            res.on('data', (data) => {
                returnData += data;
            });
            res.on('end', () => {
                return callback(true, dataExtractor(returnData));
            });
            res.on('error', (er) => {
                return callback(false, null);
            });
        });
        var requestData = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "SportsAPING/v1.0/" + apiMethod,
            "params": params
        };
        req.write(JSON.stringify(requestData));
        req.end();
    }
    
    private keepAlive(callback : BetfairLoggingCallback){
        var keepAliveHeaders = {
            'X-Application' : this._headers.applicationKey, 
            'X-Authentication' : this._headers.authToken,
            'Accept' : 'application/json'
        };
        var req = https.request({
            host : "identitysso.betfair.com",
            path : "/api/keepAlive",
            method : "GET",
            headers : keepAliveHeaders
        }, (res) => {
            if(res.statusCode != 200){
                console.warn("Error making keep alive request.");
                return callback(false, null);
            }     
            res.setEncoding('utf8');
            res.on('data', (d) => {
                var json = JSON.parse(d);
                if(json.status == "SUCCESS"){
                    console.info("Keep Alive request successful");
                    return callback(true, null);
                }
            });
        });
        req.on('error', (e) => {
            console.error('Error making keep alive request.' + e);
            return callback(false, null);
        });
        req.end();
    }
}

//BetfairServiceFactory
export class BetfairServiceFactory {
    private _service : IBetfairService;
    getService(applicationKey: string, username: string, password: string){
        if(!this._service){
            return new BetfairService(applicationKey, username, password);
        }
        return this._service;
    }
}  
