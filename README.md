# keyclue_intern
2018.12.26~2019.2.25

# 비동기 방식에서의 순차처리 방법
- Node.js코딩을 하면서 순서대로 실행 되도록 해야 하는 부분이 많았다.
- Node.js는 Asynchronous 하기 때문에, 순서를 보장하기 위한 특정 방법을 사용 하여야 한다.
1. 순서를 보장하는 방법의 종류
    - settime()함수로 일정시간 딜레이 시켜서 동기적인 순서로 만들기 -> 해당시간을 넘기면 비동기적이되고, 시간이 남으면 비효율적
    - callback함수. 콜백중첩때문에 복잡하긴 했지만, callback으로 다 해결했음.
    - Promise callback중첩을 없애어 가독성이 좋다. 해당 프로젝트에서는 사용하지 않았음.
    - async, await 마찬가지로 callback보다 편리하지만 해당 프로젝트에서는 사용하지 않았음.
2. 참고로, for문과 callback을 같이 사용하면서, 여러개의 콜백이 끝난후 다음 코드가 실행되어야 하는 상황
    - 처음에 settime으로 일정 시간을 주어서 모든 callback이 실행됨을 보장하고 다음 코드를 실행했지만, 비효율적.
    - 해결방법은 변수하나를 만들어서 callback함수가 실행되는 숫자를 세어, 전체가 다 실행되었음을 체크한 후 다음부분을 실행하면 된다.
    
```javascript
var count = 0;
for(){
	client.execute('',{
		},function(){ 
			count++; 
		})
}
if(count == total){
	~~~~
}
```


# 해관신청용 프로그램.
1. 해관신청이란
    - 중국 티몰에 물건을 판매하기 위해서는 판매자는 물건을 업로드 한 후 물건의 데이터를 티몰측에 보내어 pass를 받아야 함.
    - 이 작업을 해관신청이라 하는데 이때 3개의 엑셀시트에 물건의 데이터를 채워서 보내야 함.
    - 시트에 채울 데이터를 Tmall의 REST api를 이용하여 구하고, Nodejs라이브러리를 이용하여 엑셀파일로 만들어줌.
2. Tmall api사용 예시
```javascript
router.post("/celldown", function(req, res){
    client.execute('taobao.items.inventory.get', {
		'session' : process.env.TMALL_SESSION,
		'seller_cids': selectedCid,
		'banner':'never_on_shelf',
		'fields':'approve_status, num_iid, title, nick, type, cid,
		'order_by':'list_time:desc',
		'page_no':'1',
		'page_size':'200'
		}, function(error, response) {
			if (!error){}
		}
});
```

3. Nodejs라이브러리사용, 엑셀시트로 저장하기(tmall.js)
```javascript
var mongoXlsx = require('mongo-xlsx');

for(var i in rs){
    var tempdata = {
	"SPU": ri.outer_id,
	"SPU_ID": ri.num_iid,
	"SKU": rs[k].outer_id,
	"SKU_ID": rs[k].sku_id}};
    arrData.push(tempdata);
}
var modelforAll = [ 
	{ displayName: 'SPU', access: 'SPU', type: 'string' },
	{ displayName: 'SPU_ID', access: 'SPU_ID', type: 'number' },
	{ displayName: 'SKU', access: 'SKU', type: 'string' },
	{ displayName: 'SKU_ID', access: 'SKU_ID', type: 'number' }]

console.log("파일 저장위치 : "+__dirname);
mongoXlsx.mongoData2Xlsx(arrData, model1, function(err, data) {
	console.log('시트1번 이름 :', data.fullPath); 
});
```

4. mlab에 데이터를 저장하는 부분(api.js)
```javascript
	mongoose.connect(process.env.MONGO_DB_URI, { useNewUrlParser: true } ,function(err,db){
		if(err){
			console.log(err);
		}else{
			try{
				console.log("here is "+ typeof(Darr));
				db.collection(brand).insertMany(Darr);
			} 
			catch(e){console.log(e);}
			db.close();
		}
	});
```

---
다음 개발사항 : 이미지업로드
