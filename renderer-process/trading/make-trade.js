const fs = require('fs')
const os = require('os')
const path = require('path')

const SYMBOL_list = require('./symbols.js');
const symbolList = SYMBOL_list.symbolList();

const AutoTrader = require('./at.js');
const crypto = require('crypto');
var XMLHttpRequest = require('xmlhttprequest').XMLHttpRequest;

// ************** IMPORTS END ************** 

const tradeExecuteBuy = document.getElementById('trade-execute-buy')
const tradeExecuteSell = document.getElementById('trade-execute-sell')

const tradeExecuteMsg = document.getElementById('trade-execute-msg')
const inputMsg = document.getElementById('trade-input-msg')
const tradeMsg = document.getElementById('trade-info-msg')
const pnlMsg = document.getElementById('trade-pnl-msg')
const ordersMsg = document.getElementById('trade-orders-msg')

const confirmTradeCheckbox = document.getElementById('trade-execute-confirm');
const makeTradeCheckbox = document.getElementById('trade-execute-makeTrade');
const withPNLCheckbox = document.getElementById('trade-execute-withPNL');

let symbol = "btcusdt";
const tradeTokenList = document.getElementById('trade-tokens');

let tokenEvent = (event) =>
{
  let token = event.currentTarget.dataset.token;
  const activeTokenDom = document.getElementsByClassName('active-token');
  for (var i = 0; i < activeTokenDom.length; i++)
  {
    activeTokenDom[i].className = activeTokenDom[i].className.replace("active-token", "");
  }
  const tokenDom = document.getElementById('token-'+token);
  tokenDom.className += " active-token";
  symbol = token+"usdt";
};

for (var i = 0; i < tradeTokenList.children.length; i++)
{
  tradeTokenList.children[i].children[0].addEventListener('click', tokenEvent);
}

let inputFormGroup = {
  tradeAmount: document.getElementById('input-tradeAmount'),
  tradePrice: document.getElementById('input-tradePrice'),
  tradePNL: document.getElementById('input-tradePNL'),
};

let tradeEvent = (event) =>
{
  // EXAMPLE REQUEST
  let quantity = "";
  let price = "";
  let pnl = "";

  let exchange = "futures";
  let side = event.currentTarget.dataset.side;
  if (inputFormGroup.tradeAmount.value.length)
  {
    quantity = inputFormGroup.tradeAmount.value;
  } else {
    quantity = "1";
  }
  if (inputFormGroup.tradePrice.value.length)
  {
    price = "@" + inputFormGroup.tradePrice.value + (makeTradeCheckbox.checked ? "" : "*");
  } else {
    price = "@market" + (makeTradeCheckbox.checked ? "" : "*");
  }
  if (withPNLCheckbox.checked)
  {
    pnl = inputFormGroup.tradePNL.value;
  } else {
    pnl = "";
  }
  
  var myArgs = ["futures",side,symbol,quantity,price,pnl];

  tradeMsg.innerHTML = "";
  ordersMsg.innerHTML = "";

  let autoTraderResponse = getAutoTrader(myArgs);

  if (!autoTraderResponse.success)
  {
    inputMsg.innerHTML = '<p>Trade not executed.</p>'
    inputMsg.innerHTML += '<i class="fas demo-meta fa-6x text-danger fa-times"></i>'
    inputMsg.innerHTML += "<h2>ERROR</h2>";    
    inputMsg.innerHTML += "<h2>"+autoTraderResponse.msg+"</h2>";    
    return;
  }

  let autoTrader = autoTraderResponse.autoTraderObject;
  let response = autoTrader.order.atMarket(   autoTraderResponse.data.exchange,
                                              autoTraderResponse.data.side,
                                              autoTraderResponse.data.symbol,
                                              autoTraderResponse.data.quantity,
                                              autoTraderResponse.data.price,
                                              autoTraderResponse.data.pnl);


  exchange = response.exchange;
  side = response.side;
  symbol = response.symbol;
  quantity = response.quantity;
  price = response.price;
  pnl = response.pnl;
  
  inputMsg.innerHTML = "<p>requesting price..."+"</p>";
  inputMsg.innerHTML += '<i class="fas demo-meta fa-8x fa-circle-notch  fa-spin"></i>'

  // tradeExecuteMsg.innerHTML += "<h2>EXAMPLE INPUT</h2>";
  // tradeExecuteMsg.innerHTML += "<ul>";
  // tradeExecuteMsg.innerHTML += "<li>exchange: "+exchange+"</li>";
  // tradeExecuteMsg.innerHTML += "<li>side: "+side+"</li>";
  // tradeExecuteMsg.innerHTML += "<li>symbol: "+symbol+"</li>";
  // tradeExecuteMsg.innerHTML += "<li>quantity: "+quantity+"</li>";
  // tradeExecuteMsg.innerHTML += "<li>price: "+price+"</li>";
  // tradeExecuteMsg.innerHTML += "<li>pnl: "+pnl+"</li>";
  // tradeExecuteMsg.innerHTML += "</ul>";

  let newPriceRequest = response.priceRequest;
  let onLoadFunction = newPriceRequest.onload;

  newPriceRequest.onload = () =>
  {
    let data = onLoadFunction(newPriceRequest.responseText);
    
    tradeExecuteMsg.innerHTML += `<pre>responseText: <code class="language-bash">${newPriceRequest.responseText}</code></pre>`;
    tradeExecuteMsg.innerHTML += "<br>";

    tradeExecuteMsg.innerHTML += `<pre>signedRequestUrl: <code class="language-bash">${data.signedRequestUrl}</code></pre>`;


    ordersMsg.innerHTML = `<div style="color: red">Settings>Confirm Trade: ${confirmTradeCheckbox.checked}<div>`;
    ordersMsg.innerHTML += "<h2>ORDERS</h2>";
    ordersMsg.innerHTML += "<ul>";
    for (var i = 0; i < data.payload.length; i++)
    {
      if (!Object.keys(data.payload[i]))
      {
        ordersMsg.innerHTML +=  `<li>Order N°${i}: - </li>`;
      } else {
        ordersMsg.innerHTML +=  `<li>Order N°${i}: ${data.payload[i].side} (${data.payload[i].quantity}) ${data.payload[i].symbol} ${data.payload[i].price ? data.payload[i].price : data.pnl.tradePrice} ${data.payload[i].reduceOnly ? "[reduceOnly]" : ""}</li>`;

        // tradeExecuteMsg.innerHTML += "<ul>";
        // tradeExecuteMsg.innerHTML += "<li>type: "+data.payload[i].type+"</li>";
        // tradeExecuteMsg.innerHTML += "<li>side: "+data.payload[i].side+"</li>";
        // tradeExecuteMsg.innerHTML += "<li>symbol: "+data.payload[i].symbol+"</li>";
        // tradeExecuteMsg.innerHTML += "<li>quantity: "+data.payload[i].quantity+"</li>";
        // tradeExecuteMsg.innerHTML += "<li>price: "+data.payload[i].price+"</li>";
        // tradeExecuteMsg.innerHTML += "</ul>";
      }
    }
    ordersMsg.innerHTML += "</ul>";

    tradeMsg.innerHTML = "";
    if (withPNLCheckbox.checked)
    {
      tradeMsg.innerHTML += `<div style="display:flex; padding: 0 20px">
        <span style="width: 50px">profit:</span
        ><span style="flex:1">${data.pnl.profitPrice}</span> <span>${data.pnl.profitAmount}</span></div>`;
    } else {
      tradeMsg.innerHTML += `<div style="display:flex; padding: 0 20px">
        <span style="width: 50px">profit:</span><span style="flex:1">-</span><span>-</span></div>`
    }

    if (makeTradeCheckbox.checked)
    {
      tradeMsg.innerHTML += `<div style="display:flex; padding: 0 20px">
        <span style="width: 50px">trade:</span
        ><span style="flex:1">${data.pnl.tradePrice}</span> <span>-</span></div>`;
    } else {
      tradeMsg.innerHTML += `<div style="display:flex; padding: 0 20px">
        <span style="width: 50px">trade:</span><span style="flex:1">-</span><span>-</span></div>`
    }

    if (withPNLCheckbox.checked)
    {
      tradeMsg.innerHTML += `<div style="display:flex; padding: 0 20px">
        <span style="width: 50px">loss:</span
        ><span style="flex:1">${data.pnl.lossPrice}</span> <span>${data.pnl.lossAmount}</span></div>`;
    } else {
      tradeMsg.innerHTML += `<div style="display:flex; padding: 0 20px">
        <span style="width: 50px">loss:</span><span style="flex:1">-</span><span>-</span></div>`
    }

    // pnlMsg.innerHTML = "<h2>PNL ANALYSIS</h2>";
    // pnlMsg.innerHTML += "<ul>";
    // pnlMsg.innerHTML += "<li>hasProfit: "+data.pnl.hasProfit+"</li>";
    // pnlMsg.innerHTML += "<li>profitAmount: "+data.pnl.profitAmount+"</li>";
    // pnlMsg.innerHTML += "<li>makeTrade: "+data.pnl.makeTrade+"</li>";
    // pnlMsg.innerHTML += "<li>hasLoss: "+data.pnl.hasLoss+"</li>";
    // pnlMsg.innerHTML += "<li>lossAmount: "+data.pnl.lossAmount+"</li>";
    // pnlMsg.innerHTML += "</ul>";

    let TheRequest = autoTrader.getTheRequest("post", data.signedRequestUrl);
    TheRequest.onload = () => {
      inputMsg.innerHTML = '<p>Trade executed.</p>'
      inputMsg.innerHTML += '<i class="fas demo-meta fa-6x text-danger fa-check"></i>'
    };
    if (!confirmTradeCheckbox.checked)
    {
      inputMsg.innerHTML = '<p>Trade not executed.</p>'
      inputMsg.innerHTML += '<i class="fas demo-meta fa-6x text-danger fa-times"></i>'
      inputMsg.innerHTML += `<div class="demo-meta" >confirmTrade: ${confirmTradeCheckbox.checked}</div>`;
      tradeExecuteMsg.innerHTML = "";
    } else {
      TheRequest.send();
    }
  };
  newPriceRequest.send();
};

tradeExecuteBuy.addEventListener('click', tradeEvent);
tradeExecuteSell.addEventListener('click', tradeEvent);

function getAutoTrader(myArgs)
{
  let exchange = myArgs[0];

  if (exchange != "futures" && exchange != "spot")
  {
    console.log("Invalid exchange"); return {success:false,msg:"Invalid exchange"}
    return;
  }

  let action = myArgs[1];

  if (
    (action != "buy" && action != "sell" && action != "leverage")
    ||
    (exchange == "spot" && action == "leverage")
    )
  {
    console.log("Invalid action");; return {success:false,msg:"Invalid action"}
    return;
  }

  let symbol = myArgs[2];

  if (!symbol)
  {
    console.log("Invalid symbol: ", symbol); return {success:false,msg:"Invalid symbol"}
    return;
  }

  symbol = symbol.toUpperCase();

  if (action == "leverage")
  {
    let leverage = myArgs[3];

    if (!isFinite(leverage))
    {
      console.log("Invalid leverage: ", leverage); return {success:false,msg:"Invalid leverage"}
      return;
    }

    let newTrade = new AutoTrader({},{});

    newTrade.settings.leverage(symbol, leverage);
    return;
  } 

  if (action == "buy" || action == "sell")
  {
    let side = action.toUpperCase();
    let quantity = myArgs[3];

    if (!isFinite(quantity))
    {
      console.log("Invalid quantity: ", quantity); return {success:false,msg:"Invalid quantity"}
      return;
    }

    let price = myArgs[4];

    if (!price || price[0] != "@")
    {
      console.log("Invalid price: ", price); return {success:false,msg:"Invalid price"}
      return;
    }

    price = price.substr(1);

    if (!((isFinite(price) || isFinite(price.substr(0,price.length - 2))) || ["market", "market*"].indexOf(price) != -1))
    {
      console.log("Invalid price: ", price); return {success:false,msg:"Invalid price"}
      return;
    }

    let pnlString = myArgs[5];
    let pnl = [];

    if (pnlString)
    {
      if (pnlString != "send")
      {
        pnl = pnlString.split(":");

        if (pnl.length > 1)
        {
          if (!isFinite(pnl[0]) || !isFinite(pnl[1]))
          {
            console.log("Invalid profit and loss: ", pnlString); return {success:false,msg:"Invalid profit and loss"}
            return;
          }
        } else {
          pnl = [];
        }
      }
    }


    let newTrade = new AutoTrader({
      "lastArgument": myArgs[myArgs.length - 1],
    },{});

    return {
      success: true,
      autoTraderObject: newTrade,
      data: {
        exchange: exchange,
        action: action,
        symbol: symbol,
        side: side,
        quantity: quantity,
        price: price,
        pnl: pnl,
      },
    }
  }
}
