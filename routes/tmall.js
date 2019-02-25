var express = require('express');
var router = express.Router();
var passport = require('passport');
var User = require('../models/user');
var xlsx = require('xlsx');
var request = require('request');
var fs = require('fs');
var multer = require('multer');
var tableify = require('tableify');
var middleware = require('../middleware');
var json2xls = require('json2xls');
var mongoose = require("mongoose");
var mongoXlsx = require('mongo-xlsx');
var arraysort = require('array-sort');

var ApiClient = require('taobao-sdk').ApiClient;

var client = new ApiClient({
	appkey: process.env.TMALL_API_KEY,
	appsecret: process.env.TMALL_API_SECRET,
	REST_URL: 'http://gw.api.taobao.com/router/rest'
});

var storage = multer.diskStorage({
	destination: function (req, file, cb) {
		cb(null, '/tmp/keyclue-upload');
	},
	filename: function (req, file, callback) {
		callback(null, Date.now() + file.originalname);
	}
});
var xlsxFilter = function (req, file, cb) {
	// accept image files only
	if (!file.originalname.match(/\.(xlsx|xls)$/i)) {
		return cb(new Error('Only xlsx, xls files are allowed!'), false);
	}
	cb(null, true);
};
var imageFilter = function (req, file, cb) {
	// accept image files only
	if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
		return cb(new Error('Only image files are allowed!'), false);
	}
	cb(null, true);
};

var upload = multer({ storage: storage, fileFilter: xlsxFilter });

//tmall root route
router.get('/', function (req, res) {
	res.render('tmall/tmall');
});

router.post('/', function (req, res) {
	if (!error) {
		res.render('tmall/tmall-success');
	}
	console.log(error);
});

router.get('/item', function (req, res) {
	res.render('tmall/tmall-item');
});

router.post('/item', function (req, res) {
	var qinput = req.body.keyword;
	client.execute(
		'taobao.items.inventory.get',
		{
			session: process.env.TMALL_SESSION,
			'q': qinput,
			//    'seller_cids' : '1294459592',
			//			banner: 'never_on_shelf',
			page_no: '1',
			page_size: '40',
			fields: 'approve_status,num_iid,type,cid,num,list_time,price,modified,seller_cids,outer_id, title',
			start_created: '2019-01-01 00:00:00',
			start_modified: '2019-01-01 00:00:00'
		},
		function (error, response) {
			if (!error) {
				var Products = response.items.item;
				console.log(Object.keys(Products).length);
				Products = tableify(Products);
				res.render('tmall/tmall-item-success', { Products: Products });
			} else {
				res.render('tmall/tmall-item-success', { Products: '조건에 맞는 제품이 없습니다.' });
			}

		}
	);
});

router.get('/search', function (req, res) {
	res.render('tmall/tmall-search');
});

router.post('/search', function (req, res) {
	console.log(req.body.keyword);
	client.execute(
		'taobao.products.search',
		{
			session: process.env.TMALL_SESSION,
			fields: 'product_id,name,pic_url,cid,props,price,tsc',
			q: req.body.keyword,
			cid: '50011999',
			props: 'pid:vid;pid:vid',
			status: '3',
			page_no: '1',
			page_size: '40',
			vertical_market: '4',
			customer_props: '20000:优衣库:型号:001:632501:1234',
			suite_items_str: '1000000062318020:1;1000000062318020:2;',
			barcode_str: '6924343550791,6901028180559',
			market_id: '2'
		},
		function (error, response) {
			if (!error) console.log(response);
			else console.log(error);
		}
	);
});

router.get('/orders', function (req, res) {
	res.render('tmall/tmall-orders');
});

router.post("/orders", function (req, res) {

	var date = req.body.dates;

	var date_Split = date.split(' - ');
	var date_Start = date_Split[0].split('/');

	var date_startReplace = date_Start[2] + '-' + date_Start[0] + '-' + date_Start[1];

	var date_end = date_Split[1].split('/');
	var date_endReplace = date_end[2] + '-' + date_end[0] + '-' + date_end[1];
	// datepicker 포맷을 타오바오 날짜 형식으로 변경

	var brand = {};
	var Props = {};
	var arrData = [];
	var splitInfo = [];

	client.execute('taobao.trades.sold.get', {
		'session': process.env.TMALL_SESSION,
		'fields': 'tid,num_iid,receiver_state,title,orders.oid,orders.num_iid,buyer_nick,pay_time,receiver_name,receiver_mobile,receiver_zip,receiver_city,receiver_district,receiver_address,orders.outer_sku_id,orders.title,payment,orders.num,orders.refund_status,has_seller_memo,has_buyer_message,seller_flag',
		'start_created': date_startReplace, // datepicker start
		'end_created': date_endReplace, //datepicker end
		//		'status': "WAIT_SELLER_SEND_GOODS",
		'type': 'tmall_i18n'
	}, function (error, response) {
		var total_results = response.total_results;
		//console.log(total_results, response);

		if (!error && total_results != 0) {
			var Trades = response.trades.trade;
			var index = 0;
			function renderOrderInfo() {
				var table = tableify(arrData);
				//				console.log(arrData);
				res.render('tmall/tmall-orders-success', { table: table });
			}
			//			console.log(Trades);
			Trades.forEach(function (Trade) {
				if (Trade.orders && Trade.pay_time) {
					client.execute('taobao.trade.get', {
						'session': process.env.TMALL_SESSION,
						'fields': 'seller_memo,buyer_message',
						'tid': Trade.tid
					}, function (error, response) {
						if (!error) {
							var orders_Memo = response.trade;
							Orders = Trade.orders.order;
							var num_items = Orders.length;
							//							console.log(index, Orders);
							var index1 = 0;

							Orders.forEach((Order) => {
								client.execute('taobao.logistics.orders.detail.get', {
									'session': process.env.TMALL_SESSION,
									'fields': 'tid,order_code',
									'tid': Trade.tid,
									'page_no': '1',
									'page_size': '40'
								}, function (error, response) {
									if (!error) {
										order_code = response.shippings.shipping[0].order_code;
										client.execute('taobao.item.seller.get', { //product_id 가져오기
											'session': process.env.TMALL_SESSION,
											'fields': 'product_id',
											'num_iid': Order.num_iid
										}, function (error, response) {
											if (!error) {
												client.execute('taobao.product.get', {
													'session': process.env.TMALL_SESSION, //브랜드명 가져오기
													'fields': 'props_str',
													'product_id': response.item.product_id
												}, function (error, response) {
													if (!error) {
														var temp = {
															"주문날짜": Trade.pay_time,
															"매장": Trade.title,
															"주문번호": Trade.tid,
															"고객ID": Trade.buyer_nick,
															"결제시간": Trade.pay_time,
															"수취인": Trade.receiver_name,
															"핸드폰번호": Trade.receiver_mobile,
															"우편번호": Trade.receiver_zip,
															"수취인주소": Trade.receiver_state + Trade.receiver_city + Trade.receiver_district + Trade.receiver_address,
															"SKU": Order.outer_sku_id,
															"상품명": Order.title,
															"가격": Trade.payment,
															"USD 가격": (Trade.payment / 7.00).toFixed(2),
															"개수": Order.num,
															"물류회사": "",
															"송장번호": order_code,
															"브랜드": "",
															"구매자요청": "",
															"등록시간": "",
															"발송시간": "",
															"판매자메모": "",
															"합배송": "",
															"환불상태": ""
														};

														if (num_items > 1) {
															temp.합배송 = '동일고객합배송';
														}
														if (Trade.payment >= 5000) {
															temp.물류회사 = "EMS";
														}
														else temp.물류회사 = "ICB";
														if (orders_Memo.seller_memo) {
															temp.판매자메모 = orders_Memo.seller_memo;
														}
														if (orders_Memo.buyer_message) {
															temp.구매자요청 = orders_Memo.buyer_message;
														}
														if (Order.refund_status === "SUCCESS") {
															temp.환불상태 = "환불"
														}

														console.log(response.product)
														brand = response.product.props_str;
														brand = brand.replace(';', '","');
														brand = brand.replace('货号:', '货号":"');
														brand = brand.replace('品牌:', '品牌":"');
														brand = brand.replace('款号:', '款号":"');
														Props = JSON.parse('{"' + brand + '"}');
														brand = Props.品牌;
														temp.브랜드 = brand;

														arrData.push(temp);
														index1++;
														if (index1 === num_items) {
															index++;
															if (index === total_results) {
																arraysort(arrData, '주문날짜', '고객ID');
																renderOrderInfo();
															}
														}
													}
													else {
														index1++;
														if (index1 === num_items) {
															index++;
														}
														console.log('product.get error', index, error);
													}
												});
											}
											else {
												index1++;
												if (index1 === num_items) {
													index++;
												}
												console.log('item.seller.get error', index, error);
											}
										});
									}
									else console.log('logistics.get err', error);
								})
							});
						}
						else {
							index++
							console.log('trade.get error', index, error);
						}
					});
				}
				else {
					index++;
					console.log('no order', index);
					if (index === total_results) {
						renderOrderInfo(error, response);
					}
				}
			});
		}
		else {
			console.log(error);
			var table = "주문을 찾을 수 없습니다.";
			res.render('tmall/tmall-orders-success', { table: table });
		}
	});
});

//brandList를 업데이트하기위한 코드
router.get("/cellupdate", function(req, res){
	client.execute('taobao.sellercats.list.get', {
	  'session' : process.env.TMALL_SESSION,
	  'nick':'keyclue海外旗舰店',
	  'fields':'cid,name'
	}, function(error, response) {
	  if (!error){
	  console.log(response);
		  var tempbrand= new Array();
  
	  for (var i in response.seller_cats.seller_cat){
		  tempbrand.push(response.seller_cats.seller_cat[i].cid);
		  tempbrand.push(response.seller_cats.seller_cat[i].name);
	  }
		  var brandData = JSON.stringify(tempbrand);
		  fs.writeFile("./routes/brandData/brand.txt",brandData, 'utf8', function(err){
			  if(err) console.log(err);
			  else{
				  console.log("write success");
			  }
		  });
  
	// 	  //for test
	// 	  // fs.readFile('./routes/brandData/brand.txt', 'utf-8', function(error, data) {
	// 	  // 	var brandList = JSON.parse(data);
	// 	  // 	console.log("read : "+brandList);
	// 	  // });
	}
	  else console.log(error);
  });
});

router.get("/celldown", function (req, res) {
	res.render("tmall/tmall-celldown");
});

//taobao -> node -> db, xlsx

router.post("/celldown", function(req, res){
	var selectedCid = 0;
	var arr = [];   //num_iid를 모두 담아놓을 배열
	var arrData = new Array();    //디비에 저장할 모든 데이터를 담을 배열

	fs.readFile('./routes/brandData/brand.txt', 'utf-8', function(error, data) {
		var brandList = JSON.parse(data);
		//console.log(brandList);
		
		for(var i in brandList){
			if(brandList[i]==req.body.brandName){
			selectedCid = brandList[i-1];
			//console.log("cid is " +selectedCid);
			break;
			}
		}  

		if(selectedCid == 0){
			console.log("THERE IS NO BRAND")
		}
		else{
		 client.execute('taobao.items.inventory.get', {
			'session' : process.env.TMALL_SESSION,
			//'q':'j.gracelet', //q로 검색하면안되고 seller_cids로 해야함
			'seller_cids': selectedCid,
			//'banner':'never_on_shelf,regular_shelved, off_shelf, sold_out, violation_off_shelved',
			'banner':'never_on_shelf',
			'fields':'approve_status, num_iid, title, nick, type, cid, pic_url, num, props, valid_thru, list_time, price, has_discount, has_invoice, has_warranty, has_showcase, modified, delist_time, postage_id , seller_cids, outer_id',
			//'fields':'approve_status, num_iid, title, nick, type, cid, num, list_time,  modified, delist_time',
			'order_by':'list_time:desc',
			'page_no':'1',
			'page_size':'200',
			//'start_modified': '2018-12-01 00:00:00'
			}, function(error, response) {
				if (!error){
				var a =0; //for count
				var Products = response.items;
		
				//response의 각 item의 num_iid만 배열에 담음
				for (var i in Products.item){
					//console.log(Products.item);
					//console.log(Products.item[a].num_iid);
					arr.push(Products.item[a].num_iid);
					a++;
				}
				
				//여기부터 각 num_iid에 대해 데이터 찾아서 디비에 넣기.
				var itemcnt = 0; //마지막경우를 찾아서 excell을 쓰기 위해, spu만 카운트
				var totalcnt = 1; //sheet에 쓰이는 위치 count하기위해, sku갯수 카운트
				
				for(var j in arr){
					client.execute('taobao.item.seller.get', {
						'session' : process.env.TMALL_SESSION,
						'fields':'Property_alias,Type,input_str,num_iid,title,nick,price,approve_status,sku,outer_id,cid,num,item_weight,item_size',
						'num_iid':arr[j],
					}, function(error, response) {
						itemcnt++;
						if (!error&&response.item.skus!=undefined){
							//console.log(response);
							//console.log(response.item.skus);
							var ri = response.item;
							var rs = response.item.skus.sku;
							var linkbody = "https://detail.tmall.hk/hk/item.htm?id=";
							//var func3data = `=$AE$1&AE2&"|"&$AF$1&AF2&"|"&$AG$1&AG2&"|"&$AH$1&AH2&"|"&$AI$1&AI2&"|"&$AJ$1&AJ2&"|"&$AK$1&AK2&"|"&$AL$1&AL2&"|"&$AM$1&AM2&"|"&$AN$1&AN2`;
							var func3data = '';
							// console.log(ri);
							 //console.log(rs);
							//console.log("Brand name is " +req.body.brandName);
							//sku숫자만큼 반복
							for(var k in rs){
								//size and color 파싱해서 찾기
								var SizeandColor = rs[k].properties_name;
								var SizeorColor = SizeandColor.split(";");
								var itemColorarr = SizeorColor[0].split(":");
								var itemColor = itemColorarr[3];
								var itemSize = '均码'; //default Size is 均码(FREE)
								if(SizeorColor[1]!=null){
									var itemSizearr = SizeorColor[1].split(":");
									itemSize = itemSizearr[3];
								}
								totalcnt++;
								func3data = `=$AE$1&AE${totalcnt}&"|"&$AF$1&AF${totalcnt}&"|"&$AG$1&AG${totalcnt}&"|"&$AH$1&AH${totalcnt}&"|"&$AI$1&AI${totalcnt}&"|"&$AJ$1&AJ${totalcnt}&"|"&$AK$1&AK${totalcnt}&"|"&$AL$1&AL${totalcnt}&"|"&$AM$1&AM${totalcnt}&"|"&$AN$1&AN${totalcnt}`;

								var tempdata = {
									"SPU": ri.outer_id,
									"SPU_ID": ri.num_iid,
									"SKU": rs[k].outer_id,
									"SKU_ID": rs[k].sku_id,
									"브랜드品牌": req.body.brandName,   //Brand명
									"货品名称": '',   //Brand+카테고리+spu+색상+사이즈 13번
									"색상+사이즈": itemColor+itemSize, //14번
									"재고": rs[k].quantity,
									"소재":'', //cid는 아는데 이걸로 소재 찾아와야함.
									"HSCODE": '',
									"중량": ri.item_weight*1000,
									"판매가": ri.price,
									//text for 2번시트
									"货品类型":"普通货品",
									"否" : '否',
									//text for 3번셀
									"用途":'衣着用品',
									"011":'011',
									"盒装":'盒装',
									"韩国":'韩国',
									"1":"1",
									"035":"035",
									"link":linkbody+ri.num_iid,
									"func3":func3data,
									"品牌类型:":"服饰",
									"出口享惠情况:":"无",
									"其他:":"无"

								};
								//arrData.push(JSON.stringify(tempdata)); //이렇게 하면안됨, db insert함수의 인자로는 object를 주어야함
								arrData.push(tempdata);
								}

								//엑셀시트로 저장하는 부분 
								if(itemcnt == arr.length){
									//var model = mongoXlsx.buildDynamicModel(arrData);
									var modelforAll = [ 
										{ displayName: 'SPU', access: 'SPU', type: 'string' },
										{ displayName: 'SPU_ID', access: 'SPU_ID', type: 'number' },
										{ displayName: 'SKU', access: 'SKU', type: 'string' },
										{ displayName: 'SKU_ID', access: 'SKU_ID', type: 'number' },
										{ displayName: '브랜드品牌', access: '브랜드品牌', type: 'string' },
										{ displayName: '货品名称', access: '货品名称', type: 'string' },
										{ displayName: '색상+사이즈', access: '색상+사이즈', type: 'string' },
										{ displayName: '재고', access: '재고', type: 'string' },
										{ displayName: 'HSCODE', access: 'HSCODE', type: 'string' },
										{ displayName: '중량', access: '중량', type: 'string' },
										{ displayName: '판매가', access: '판매가', type: 'string' }]
									
									var model1 = [ 
										{ displayName: '宝贝id', access: 'SPU_ID', type: 'number' },  //spu_id
										{ displayName: '宝贝标题', access: '货品名称', type: 'string' },  //hm
										{ displayName: 'SKUid', access: 'SKU_ID', type: 'number' },  //sku_id
										{ displayName: 'SKU名称', access: '색상+사이즈', type: 'string' },  //hm
										{ displayName: '宝贝当前库存', access: '재고', type: 'number' }, //재고 
										{ displayName: '货品编码', access: 'SKU', type: 'string' },  //sku
										{ displayName: 'keyclue001', access: '재고', type: 'number' }]  //재고
								
									var model2 = [ 
										{ displayName: '货品编码(SKU)', access: 'SKU', type: 'string' },  //
										{ displayName: '货品名称', access: '-', type: 'number' },  //
										{ displayName: '品类名称', access: '-', type: 'number' },  //
										{ displayName: '品牌名称', access: '-', type: 'number' },  //
										{ displayName: '产品编码', access: '-', type: 'number' },  //
										{ displayName: '条形码', access: '-', type: 'number' },  //
										{ displayName: '货品类型', access: '货品类型', type: 'number' },  //
										{ displayName: '行业品类名', access: '-', type: 'number' },  //
										{ displayName: '吊牌价', access: '판매가', type: 'number' },  //
										{ displayName: '零售价', access: '판매가', type: 'number' },  //
										{ displayName: '成本价', access: '판매가', type: 'number' },  //
										{ displayName: '区域销售', access: '-', type: 'number' },  //
										{ displayName: '易碎品', access: '-', type: 'number' },  //
										{ displayName: '危险品', access: '-', type: 'number' },  //
										{ displayName: '效期管理', access: '否', type: 'number' },  //
										{ displayName: '有效期（天）', access: '-', type: 'number' },  //
										{ displayName: '临期预警（天）', access: '-', type: 'number' },  //
										{ displayName: '禁售天数（天）', access: '-', type: 'number' },  //
										{ displayName: '禁收天数（天）', access: '-', type: 'number' },  //
										{ displayName: '体积（cm3）', access: '-', type: 'number' },  //
										{ displayName: '长', access: '-', type: 'number' },  //
										{ displayName: '宽', access: '-', type: 'number' },  //
										{ displayName: '高', access: '-', type: 'number' },  //
										{ displayName: '重量', access: '중량', type: 'number' },  //
										{ displayName: '毛重', access: '-', type: 'number' },  //
										{ displayName: '净重', access: '-', type: 'number' },  //
										{ displayName: '皮重', access: '-', type: 'number' },  //
										{ displayName: '箱装数', access: '-', type: 'number' },  //
										{ displayName: '体积-运输单元', access: '-', type: 'number' },  //
										{ displayName: '长-运输单元', access: '-', type: 'number' },  //
										{ displayName: '宽-运输单元', access: '-', type: 'number' },  //
										{ displayName: '高-运输单元', access: '-', type: 'number' },  //
										{ displayName: '重量-运输单元', access: '-', type: 'number' },  //
										{ displayName: '税率（%）', access: '-', type: 'number' },  //
										{ displayName: '税率分类编码', access: '-', type: 'number' },  //
										{ displayName: '包含电池', access: '-', type: 'number' }, // AJ열까지
										{ displayName: '生产批号管理', access: '-', type: 'number' },
										{ displayName: '包装方式(已弃用，请勿设置)', access: '-', type: 'number' },
										{ displayName: '子货品1编码', access: '-', type: 'number' },
										{ displayName: '子货品1数量', access: '-', type: 'number' },
										{ displayName: '子货品2编码', access: '-', type: 'number' },
										{ displayName: '子货品2数量', access: '-', type: 'number' },
										{ displayName: '子货品3编码', access: '-', type: 'number' },
										{ displayName: '子货品3数量', access: '-', type: 'number' },
										{ displayName: '子货品4编码', access: '-', type: 'number' },
										{ displayName: '子货品4数量', access: '-', type: 'number' },
										{ displayName: '子货品5编码', access: '-', type: 'number' },
										{ displayName: '子货品5数量', access: '-', type: 'number' },
										{ displayName: '子货品6编码', access: '-', type: 'number' },
										{ displayName: '子货品6数量', access: '-', type: 'number' },
										{ displayName: '子货品7编码', access: '-', type: 'number' },
										{ displayName: '子货品7数量', access: '-', type: 'number' },
										{ displayName: '子货品8编码', access: '-', type: 'number' },
										{ displayName: '子货品8数量', access: '-', type: 'number' },
										{ displayName: '子货品9编码', access: '-', type: 'number' },
										{ displayName: '子货品9数量', access: '-', type: 'number' },
										{ displayName: '子货品10编码', access: '-', type: 'number' },
										{ displayName: '子货品10数量', access: '-', type: 'number' },
										{ displayName: '子货品11编码', access: '-', type: 'number' },
										{ displayName: '子货品11数量', access: '-', type: 'number' },
										{ displayName: '子货品12编码', access: '-', type: 'number' },
										{ displayName: '子货品12数量', access: '-', type: 'number' },
										{ displayName: '子货品13编码', access: '-', type: 'number' },
										{ displayName: '子货品13数量', access: '-', type: 'number' },
										{ displayName: '子货品14编码', access: '-', type: 'number' },
										{ displayName: '子货品14数量', access: '-', type: 'number' },
										{ displayName: '子货品15编码', access: '-', type: 'number' },
										{ displayName: '子货品15数量', access: '-', type: 'number' },
										{ displayName: '子货品16编码', access: '-', type: 'number' },
										{ displayName: '子货品16数量', access: '-', type: 'number' },
										{ displayName: '子货品17编码', access: '-', type: 'number' },
										{ displayName: '子货品17数量', access: '-', type: 'number' },
										{ displayName: '子货品18编码', access: '-', type: 'number' },
										{ displayName: '子货品18数量', access: '-', type: 'number' },
										{ displayName: '子货品19编码', access: '-', type: 'number' },
										{ displayName: '子货品19数量', access: '-', type: 'number' },
										{ displayName: '子货品20编码', access: '-', type: 'number' },
										{ displayName: '子货品20数量', access: '-', type: 'number' }] 
								
									var model3 = [ 
											{ displayName: '货品ID*', access: 'SPU_ID', type: 'string' },  //
											{ displayName: '货品英文名称', access: 'SKU', type: 'string' },  //
											{ displayName: '规格型号*', access: '색상+사이즈', type: 'string' },  //
											{ displayName: '主要成分*', access: '소재', type: 'string' },  //
											{ displayName: '用途*', access: '用途', type: 'string' },  //
											{ displayName: '商品备案价格（人民币：元）*', access: '판매가', type: 'string' },  //
											{ displayName: '生产企业*', access: '브랜드品牌', type: 'string' },  //
											{ displayName: '销售单位*', access: '011', type: 'string' },  // 텍스트
											{ displayName: '销售包装*', access: '盒装', type: 'string' },  // 텍스트
											{ displayName: '品牌*', access: '브랜드品牌', type: 'string' },  //
											{ displayName: '前端宝贝链接', access: 'link', type: 'string' },  // 상품등록링크
											{ displayName: '贸易国*', access: '韩国', type: 'string' },  //
											{ displayName: '启运国*', access: '韩国', type: 'string' },  //
											{ displayName: '原产国*', access: '韩国', type: 'string' },  //
											{ displayName: 'HSCODE*', access: 'HSCODE', type: 'string' },  //
											{ displayName: '申报要素*', access: '-', type: 'string' },  //텍스트3개 + 카테고리+성분함량
											{ displayName: '第一单位*', access: '011', type: 'string' },  //
											{ displayName: '第一数量*', access: '1', type: 'string' },  //
											{ displayName: '第二单位', access: '035', type: 'string' },  //
											{ displayName: '第二数量', access: '1', type: 'string' },  //
											{ displayName: '目的国申报价值(出口)', access: '-', type: 'string' },  //
											{ displayName: '目的国申报货币类型(出口)', access: '-', type: 'string' },  //
											{ displayName: '品牌所在国', access: '-', type: 'string' },  //
											{ displayName: '生产企业地址', access: '-', type: 'string' },  //
											{ displayName: 'sku', access: 'SKU', type: 'string' },
											{ displayName: '', access: 'func3', type: 'string' }, 
											{ displayName: '', access: '-', type: 'string' }, //AA
											{ displayName: '', access: '-', type: 'string' }, //AB
											{ displayName: '', access: '-', type: 'string' }, //AC
											{ displayName: '', access: '-', type: 'string' }, //AD
											{ displayName: '品牌类型:', access: '品牌类型:', type: 'string' }, //AE
											{ displayName: '出口享惠情况:', access: '出口享惠情况:', type: 'string' }, //AF
											{ displayName: '品名:', access: '-', type: 'string' }, //AG
											{ displayName: '织造方法:', access: '-', type: 'string' }, //AH
											{ displayName: '种类:', access: '-', type: 'string' }, //AI
											{ displayName: '类别:', access: '-', type: 'string' }, //AJ
											{ displayName: '成分含量:', access: '-', type: 'string' }, //AK
											{ displayName: '品牌:', access: '-', type: 'string' }, //AL
											{ displayName: '其他:', access: '其他:', type: 'string' }, //AM
											{ displayName: '货号:', access: '-', type: 'string' }, ]  //AN					
									//excell에 쓰기.
									/* Generate Excel */
									console.log("파일 저장위치 : "+__dirname);
									mongoXlsx.mongoData2Xlsx(arrData, model1, function(err, data) {
										console.log('시트1번 이름 :', data.fullPath); 
									});
									mongoXlsx.mongoData2Xlsx(arrData, model2, function(err, data) {
										console.log('시트2번 이름 :', data.fullPath); 
									});
									mongoXlsx.mongoData2Xlsx(arrData, model3, function(err, data) {
										console.log('시트3번 이름 :', data.fullPath); 
									});
									
									//화면에 엑셀하나 띄워줌
									var brandtable = tableify(arrData);
									res.render('tmall/tmall-celldown-success', { Orders: brandtable });
					
							}
						}
						
						else console.log("error");
						}
					)
				}
	
			// //DB에 저장하는 부분
			// // setTimeout(function(){},3000); 
			//           mongoose.connect("mongodb://localhost:27017/testz", { useNewUrlParser: true } ,function(err,db){
			//           if(err){
			//             console.log(err);
			//           }else{
			//             //console.log(arrData);
			//             try{
			//               db.collection('test').insertMany(arrData);
			//               //db.collection('test').insertOne(tempdata);
			//             } 
			//             catch(e){console.log(e);}
			//             db.close();
			//           }
			//         });
			}
					else console.log(error);
				}
	)
	}
	});

});
module.exports = router;
