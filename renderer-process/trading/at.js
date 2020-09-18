const SYMBOL_list = require('./symbols.js');
const symbolList = SYMBOL_list.symbolList();

const crypto = require('crypto');
var XMLHttpRequest = require('xmlhttprequest').XMLHttpRequest;

module.exports = class AutoTrader {
	constructor(options, data = null)
	{
		let self = this;

		this.urls = {
			"spot" : {
				baseUrl  : "https://api.binance.com",
				batchOrder : "/api/v3/batchOrders",
				price : "/api/v3/ticker/bookTicker",
			},
			"futures" : {
				baseUrl  : "https://fapi.binance.com",
				batchOrder : "/fapi/v1/batchOrders",
				price : "/fapi/v1/ticker/bookTicker",
				leverage : "/fapi/v1/leverage",
				orders : "/fapi/v1/order",
			},
		};

		this.keys = {
			"akey" : "piZRjuGuyuIv92TPzcSmtpdFBXNfBqvnBB1Dq2ilK8ST3X6v7RfMOANhoLbqCxPj",
			"skey" : "d6LtaHmplERpe1N8iI3WEDauL548BGbFIkI6uLfOOqGjfbFs6oiJ4mfO2rcOzohH",
		};

		this.theRequest = {};

		this.options = Object.assign({
		}, options);

		this.settings =
		{
			leverage(symbol, leverage)
			{
				let baseUrl = self.urls["futures"].baseUrl;
				let leverageEndPoint = self.urls["futures"].leverage;
				let leverageValue = parseInt(leverage);

				let dataQueryString = `symbol=${symbol}&leverage=${leverage}`;
				let signedRequestUrl = self.signRequest(baseUrl, leverageEndPoint, dataQueryString);
				console.log("REQUEST URL: ",signedRequestUrl)

				self.send("post", signedRequestUrl);
			},
		};

		this.query = {
			orders(exchange)
			{
				let baseUrl = self.urls[exchange].baseUrl;
				let ordersEndPoint = self.urls[exchange].orders;

				let dataQueryString = `symbol=BTCUSDT`;
				let signedRequestUrl = self.signRequest(baseUrl, ordersEndPoint, dataQueryString);

				return {
					signedRequestUrl: signedRequestUrl,
				};
			},
		}

		this.order =
		{
			buy(exchange, symbol, quantity, price)
			{
				let baseUrl = self.urls[exchange].baseUrl;
				let endPoint = self.urls[exchange].batchOrder;

				let dataQueryString = self.getPayload(symbol, "BUY", quantity, price);
				let signature = crypto.createHmac('sha256', self.keys['skey']).update(dataQueryString).digest('hex');

				// self.send(baseUrl + endPoint + '?' + dataQueryString + '&signature=' + signature);
			},
			atMarket(exchange, side, symbol, quantity, price, pnl)
			{
				let baseUrl = self.urls[exchange].baseUrl;
				let priceEndPoint = self.urls[exchange].price;
				let endPoint = self.urls[exchange].batchOrder;

				let priceRequest = new XMLHttpRequest();	
				let priceUrl = baseUrl + priceEndPoint + "?symbol="+ symbol;

				let makeTrade = price[price.length - 1] != "*";

				let priceValue = makeTrade ? price : price.substr(0, price.length - 2);

				self.checkAskInfo("symbol") && console.log("SYMBOL:",symbolList[symbol])
				self.checkAskInfo("symbol") && console.log("")

				let response = (response) =>{
					let bidPrice = JSON.parse(response).bidPrice;

					self.checkAskInfo("maketrade") && console.log("MAKE TRADE:",makeTrade)
					let priceValue = (price == "market" || price == "market*") ? JSON.parse(response).bidPrice : price;
					let force = price == "market" ? "MARKET" : "LIMIT";

					self.checkAskInfo("price") && console.log("")
					self.checkAskInfo("price") && console.log("price - ",price);
					self.checkAskInfo("price") && console.log("priceValue - ",priceValue);
					self.checkAskInfo("price") && console.log("")

					let tradeAtMarketPayload = self.payload.tradeAtMarket(symbol, side, quantity, priceValue, pnl, force, makeTrade);
					let dataQueryString = tradeAtMarketPayload.dataQueryString;

					let signedRequestUrl = self.signRequest(baseUrl, endPoint, dataQueryString);
					self.checkAskInfo("url") && console.log("REQUEST URL: ",signedRequestUrl)

					return {
						signedRequestUrl: signedRequestUrl,
						payload: tradeAtMarketPayload.payload,
						pnl: tradeAtMarketPayload.pnl,
					};

					// self.send("post", signedRequestUrl);
				};


				priceRequest.onload = response;
				priceRequest.open("GET", priceUrl, true);
				return {
					priceRequest: priceRequest,
					exchange: exchange,
					side: side,
					symbol: symbol,
					quantity: quantity,
					price: priceValue,
					pnl: pnl,
					makeTrade: makeTrade,
				};
				
				priceRequest.send();
				return priceRequest;
			},

		}

		this.payload =
		{
			tradeAtMarket(symbol, side, quantity, price, pnl, force, makeTrade)
			{
				let symbolValue = symbol.toUpperCase();
				let timeInForce = "GTC";

				let priceValue = parseFloat(price);
				let quantityValue = parseFloat(quantity) * 30 / priceValue;

				let hasProfit = pnl.length && !!parseFloat(pnl[0]);
				let valueProfit = (priceValue / (100 / parseFloat(pnl[0])) * (side == "BUY" ? 1 : -1) );
				let hasLoss = pnl.length && !!parseFloat(pnl[1]);
				let valueLoss = (priceValue / (100 / parseFloat(pnl[1])) * (side == "BUY" ? -1 : 1) );

				let payload = [];

				if (makeTrade)
				{
					if (force == "MARKET")
					{
						payload.push(
						{
							"symbol": symbolValue,
							"side": side,
							"type": "MARKET",
							"quantity": parseFloat(quantityValue).toFixed(symbolList[symbolValue].quantityPrecision),
						});
					} else {
						payload.push(
						{
							"symbol": symbolValue,
							"side": side,
							"type": "MARKET",
							"type": "LIMIT",
							"timeInForce": timeInForce,
							"quantity": parseFloat(quantityValue).toFixed(symbolList[symbolValue].quantityPrecision),
							"price": ""+priceValue.toFixed(symbolList[symbolValue].pricePrecision),
						});
					}
				}

				hasProfit && payload.push(
				{
					"symbol": symbolValue,
					"side": side == "BUY" ? "SELL" : "BUY",
					"type": "TAKE_PROFIT",
					"timeInForce": timeInForce,
					"quantity": parseFloat(quantityValue).toFixed(symbolList[symbolValue].quantityPrecision),	
					"price": ""+ (priceValue + valueProfit).toFixed(symbolList[symbolValue].pricePrecision),
					"stopPrice": ""+
						(priceValue + valueProfit + (priceValue / 4000 * (side == "BUY" ? 1 : -1) )).toFixed(symbolList[symbolValue].pricePrecision),
					"reduceOnly": "true",
				});
				hasLoss && payload.push(
				{
					"symbol": symbolValue,
					"side": side == "BUY" ? "SELL" : "BUY",
					"type": "STOP",
					"timeInForce": timeInForce,
					"quantity": parseFloat(quantityValue).toFixed(symbolList[symbolValue].quantityPrecision),
					"price": ""+ (priceValue + valueLoss).toFixed(symbolList[symbolValue].pricePrecision),
					"stopPrice": ""+
						(priceValue + valueLoss + (priceValue / 4000 * (side == "BUY" ? 1 : -1) )).toFixed(symbolList[symbolValue].pricePrecision),
					"reduceOnly": "true",
				});



				self.checkAskInfo("payload") && console.log("PAYLOAD:",payload)
				self.checkAskInfo("payload") && console.log("")

				self.checkAskInfo("pnl") && console.log("PROFIT AND LOSS:", pnl.length ? pnl : "-")
				self.checkAskInfo("pnl") && console.log("")
				console.log("Profit: ",
					!hasProfit ? "-" : (priceValue + valueProfit).toFixed(symbolList[symbolValue].pricePrecision),
					!hasProfit ? "" : "("+valueProfit.toFixed(symbolList[symbolValue].pricePrecision)+")"
				);

				console.log("Trade: ",
					!makeTrade ? "-" : priceValue.toFixed(symbolList[symbolValue].pricePrecision));

				console.log("Loss: ",
					 !hasLoss ? "-" :(priceValue + valueLoss).toFixed(symbolList[symbolValue].pricePrecision),
					 !hasLoss ? "" :"("+valueLoss.toFixed(symbolList[symbolValue].pricePrecision)+")"
				);

				console.log("")

				return {
					dataQueryString: `batchOrders=`+encodeURIComponent(JSON.stringify(payload)).replace('%27', '%22'),
					payload: payload,
					pnl: {
						hasProfit: hasProfit,
						profitPrice: (priceValue + valueProfit).toFixed(symbolList[symbolValue].pricePrecision),
						profitAmount: "("+valueProfit.toFixed(symbolList[symbolValue].pricePrecision)+")",
						makeTrade: makeTrade,
						tradePrice: priceValue.toFixed(symbolList[symbolValue].pricePrecision),
						lossPrice: (priceValue + valueLoss).toFixed(symbolList[symbolValue].pricePrecision),
						lossAmount: "("+valueLoss.toFixed(symbolList[symbolValue].pricePrecision)+")",
						hasLoss: hasLoss,
						priceValue: priceValue,
						price: price,
					},
				};
			},
		}



		this.initRequest();
	}

	initRequest()
	{
		this.theRequest = new XMLHttpRequest();	

		this.theRequest.onload = () =>{
		  	console.log(`Loaded: ${this.theRequest.status} ${this.theRequest.response}`);
			console.log(this.theRequest.responseText);
		};

		this.theRequest.onerror = () =>{ // only triggers if the request couldn't be made at all
		  console.log(`Network Error`);
		};

		this.theRequest.onprogress = (event)=> { // triggers periodically
		  // event.loaded - how many bytes downloaded
		  // event.lengthComputable = true if the server sent Content-Length header
		  // event.total - total number of bytes (if lengthComputable)
		  console.log(`Received ${event.loaded} of ${event.total}`);
		};
	}

	getPayload(symbol, side, quantity, price)
	{
		let timestamp = Date.now();
		let timeInForce = "GTC";
		let recvWindow = "20000";

		let priceValue = parseFloat(price);

		let payload = [
			{
				"symbol": symbol,
				"side": side,
				"type": "LIMIT",
				"timeInForce": timeInForce,
				"quantity": quantity,
				"price": price,
			},
		];

		console.log(payload);

		return `timestamp=${timestamp}&recvWindow=${recvWindow}&batchOrders=`
					+encodeURIComponent(JSON.stringify(payload)).replace('%27', '%22');
	}

	checkAskInfo(info)
	{
		if (this.options.lastArgument == "info")
			return true;

		let infoArray = typeof myVar === 'string' ? [info] : info;

		for (var i = 0; i < infoArray.length; i++)
		{
			if (this.options.lastArgument.indexOf("info") == -1)
			{
				return false;
			}
			if (this.options.lastArgument.indexOf(infoArray[i]) == -1)
			{
				return false;
			}
		}
		return true;
	}

	signRequest(baseUrl, endPoint, dataQueryString)
	{
		let timestamp = Date.now();
		let recvWindow = "20000";

		let completeDataQueryString = dataQueryString + `&timestamp=${timestamp}&recvWindow=${recvWindow}`;

		let signature = crypto.createHmac('sha256', this.keys['skey']).update(completeDataQueryString).digest('hex');

		return baseUrl + endPoint + '?' + completeDataQueryString + '&signature=' + signature;
	}

	send(method, url)
	{
		try {
			if (this.options.lastArgument.indexOf("send") == -1) return;

			this.theRequest.open(method, url , true);
			this.theRequest.setRequestHeader('X-MBX-APIKEY', this.keys['akey']);
		  	this.theRequest.send();
		} catch(e) {
		  console.log("ERROR: Invalid exception for GET", e);
		}
	};

	getTheRequest(method, url)
	{
		// if (this.options.lastArgument.indexOf("send") == -1) return;

		this.theRequest.open(method, url , true);
		this.theRequest.setRequestHeader('X-MBX-APIKEY', this.keys['akey']);

		return this.theRequest;
	  	// this.theRequest.send();
	};
}

// ****************************************************************************************************

// exchange 	side 	symbol 		quantity 	price 		confirmation

// futures 		buy 	btcusdt 	5 			market 		send
// spot 		sell 	ethusdt 	10 			350 		send

// ****************************************************************************************************

// Name 	Type 	Mandatory 	Description
// symbol 	STRING 	YES 	
// side 	ENUM 	YES 	
// positionSide 	ENUM 	NO 	Default BOTH for One-way Mode ; LONG or SHORT for Hedge Mode. It must be sent in Hedge Mode.
// type 	ENUM 	YES 	
// timeInForce 	ENUM 	NO 	
// quantity 	DECIMAL 	NO 	Cannot be sent with closePosition=true(Close-All)
// reduceOnly 	STRING 	NO 	"true" or "false". default "false". Cannot be sent in Hedge Mode; cannot be sent with closePosition=true
// price 	DECIMAL 	NO 	
// newClientOrderId 	STRING 	NO 	A unique id among open orders. Automatically generated if not sent.
// stopPrice 	DECIMAL 	NO 	Used with STOP/STOP_MARKET or TAKE_PROFIT/TAKE_PROFIT_MARKET orders.
// closePosition 	STRING 	NO 	true, false；Close-All，used with STOP_MARKET or TAKE_PROFIT_MARKET.
// activationPrice 	DECIMAL 	NO 	Used with TRAILING_STOP_MARKET orders, default as the latest price(supporting different workingType)
// callbackRate 	DECIMAL 	NO 	Used with TRAILING_STOP_MARKET orders, min 0.1, max 5 where 1 for 1%
// workingType 	ENUM 	NO 	stopPrice triggered by: "MARK_PRICE", "CONTRACT_PRICE". Default "CONTRACT_PRICE"
// newOrderRespType 	ENUM 	NO 	"ACK", "RESULT", default "ACK"
// recvWindow 	LONG 	NO 	
// timestamp 	LONG 	YES