# keyclue_intern
2018.12.26~2019.2.25

해당 스타트업은? 소규모 한국 의류업체들의 의류를 Tmall에 판매 대행 해주는 플랫폼 스타트업

## 개발 목표 및 개발 사항
회사의 최종 개발 목표 : 의류업체에서 의류 데이터를 회사 서버로 업로드 하면, 자동으로 Tmall에 등록 해주는 플랫폼 개발  
(but, 대부분의 기능이 개발되지 않았던 상황)  
나의 개발 목표 : 직원들이 유용하게 사용 할 수 있는 몇가지 기능을 개발하여 회사 서버에 추가하기  
나의 개발 사항 : 해관신청용 엑셀 프로그램 자동 생성 프로그램 개발, 회사 서버에 MongoDB를 연동하여 판매중인 의류 데이터를 저장 등  


## 해관신청용 엑셀 파일 자동생성 프로그램
1. 해관신청이란
    - 중국 티몰에 물건을 판매하기 위해서는 판매자는 물건을 업로드 한 후 물건의 데이터를 Tmall측에 보내어 pass를 받아야 함.
    - 이 작업을 해관신청이라 하는데 이때 3개의 엑셀시트에 물건의 데이터를 채워서 보내야 하고, 해당 데이터는 Tmall 관리자 페이지에서 하나씩 볼 수 있음.
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


## 새로 배운 지식 메모
### 비동기 방식에서의 순차처리 방법
- Node.js코딩을 하면서 순서대로 실행 되도록 해야 하는 부분이 많았다.
- Node.js는 Asynchronous 하기 때문에, 순서를 보장하기 위한 특정 방법을 사용 하여야 한다.
1. 순서를 보장하는 방법의 종류
    - settime()함수로 일정시간 딜레이 시켜서 동기적인 순서로 만들기 : 해당시간을 넘기면 비동기적이되고, 시간이 남으면 비효율적
    - callback함수 : 콜백중첩 때문에 복잡하긴 했지만, callback으로 다 해결했음.
    - Promise : 콜백중첩을 없애어 가독성이 좋다. 해당 프로젝트에서는 사용하지 않았음.
    - async, await : 마찬가지로 callback보다 편리하지만 해당 프로젝트에서는 사용하지 않았음.
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
