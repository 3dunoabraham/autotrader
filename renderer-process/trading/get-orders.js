const fs = require('fs')
const os = require('os')
const path = require('path')

const SYMBOL_list = require('./symbols.js');
const symbolList = SYMBOL_list.symbolList();

const AutoTrader = require('./at.js');
const crypto = require('crypto');
var XMLHttpRequest = require('xmlhttprequest').XMLHttpRequest;

// ************** IMPORTS END ************** 

const getOrdersButton = document.getElementById('order-list-refresh')
const orderList = document.getElementById('order-list')

getOrdersButton.addEventListener('click', (event) =>
{
  let autoTrader = new AutoTrader({},{});
  let data = autoTrader.query.orders("futures");
 
  let TheRequest = autoTrader.getTheRequest("post", data.signedRequestUrl);
    orderList.innerHTML += "<p>response:"+data.signedRequestUrl+"</p>";
  TheRequest.onload = () => {
    orderList.innerHTML += "<p>response:"+"</p>";
    orderList.innerHTML += "<p>"+TheRequest.responseText+"</p>";
    orderList.innerHTML += "<p>"+Object.keys(JSON.parse(TheRequest.responseText))+"</p>";
  };
  TheRequest.send();
  return;


  let newOrdersRequest = response.ordersRequest;
  let onLoadFunction = newOrdersRequest.onload;

  newOrdersRequest.onload = () =>
  {
    let data = onLoadFunction(newOrdersRequest.responseText);
    
    tradeExecuteMsg.innerHTML += `<pre>responseText: <code class="language-bash">${newOrdersRequest.responseText}</code></pre>`;
    tradeExecuteMsg.innerHTML += "<br>";

    // tradeExecuteMsg.innerHTML += `<pre>signedRequestUrl: <code class="language-bash">${data.signedRequestUrl}</code></pre>`;

    for (var i = 0; i < data.payload.length; i++)
    {
      if (!Object.keys(data.payload[i]))
      {
        ordersMsg.innerHTML +=  `<li>Order N°${i} - </li>`;
      } else {
        ordersMsg.innerHTML +=  `<li>Order N°${i} `;

        ordersMsg.innerHTML += `${data.payload[i].side} (${data.payload[i].quantity}) ${data.payload[i].symbol} </li>`;

        // tradeExecuteMsg.innerHTML += "<ul>";
        // tradeExecuteMsg.innerHTML += "<li>type: "+data.payload[i].type+"</li>";
        // tradeExecuteMsg.innerHTML += "<li>side: "+data.payload[i].side+"</li>";
        // tradeExecuteMsg.innerHTML += "<li>symbol: "+data.payload[i].symbol+"</li>";
        // tradeExecuteMsg.innerHTML += "<li>quantity: "+data.payload[i].quantity+"</li>";
        // tradeExecuteMsg.innerHTML += "<li>price: "+data.payload[i].price+"</li>";
        // tradeExecuteMsg.innerHTML += "</ul>";
      }
    }

    // autoTrader.send(signedRequestUrl);
  };
  // newOrdersRequest.send();
})