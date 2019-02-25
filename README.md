# keyclue_intern
2018.12.26~2019.2.25

# 해관신청용 프로그램.
to make program for 해관신청, used taobao mall api
1.해관신청이란
    - 중국 티몰에 물건을 판매하기 위해서는 판매자는 물건을 업로드 한 후 물건의 데이터를 티몰측에 보내어 pass를 받아야 함.
    - 이 작업을 해관신청이라 하는데 이때 3개의 엑셀시트에 물건의 데이터를 채워서 보내야 함.
    - 시트에 채울 데이터를 Tmall의 REST api를 이용하여 구하고, Nodejs라이브러리를 이용하여 엑셀파일로 만들어줌.
2.Tmall api사용 예시
```HTML
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

3.Nodejs라이브러리사용, 엑셀시트로 저장하기(tmall.js)
```HTML
var mongoXlsx = require('mongo-xlsx');

for(var i in rs){
    var tempdata = {
					"SPU": ri.outer_id,
					"SPU_ID": ri.num_iid,
					"SKU": rs[k].outer_id,
					"SKU_ID": rs[k].sku_id};
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
4.mlab에 데이터를 저장하는 부분(api.js)
```HTML
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

# Image Upload Instructions
Video tutorial available [here](https://youtu.be/RHd4rP9U9SA)
1. Sign up for [cloudinary](https://cloudinary.com/)
    - Don't forget to check your email and activate your account
2. Install multer and cloudinary into your project
    - `npm i -S multer cloudinary`
3. Update /photos/new.ejs
```HTML
<% include ../partials/header %>
    <div class="row">
        <h1 style="text-align: center">Create a New photo</h1>
        <div style="width: 30%; margin: 25px auto;">
            <form action="/photos" method="POST" enctype="multipart/form-data">
                <div class="form-group">
                    <input class="form-control" type="text" name="photo[name]" placeholder="name">
                </div>
                <div class="form-group">
                    <label for="image">Image</label>
                    <input type="file" id="image" name="image" accept="image/*" required>
                </div>
                <div class="form-group">
                    <input class="form-control" type="text" name="photo[description]" placeholder="description">
                </div>
                <div class="form-group">
                    <button class="btn btn-lg btn-outline-secondary btn-block">Submit!</button>
                </div>
            </form>
            <a href="/photos">Go Back</a>
        </div>
    </div>
<% include ../partials/footer %>


```
5. Add multer and cloudinary configuration code to your /routes/photos.js file:
```JS
var multer = require('multer');
var storage = multer.diskStorage({
  filename: function(req, file, callback) {
    callback(null, Date.now() + file.originalname);
  }
});
var imageFilter = function (req, file, cb) {
    // accept image files only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
        return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
};
var upload = multer({ storage: storage, fileFilter: imageFilter})

var cloudinary = require('cloudinary');
cloudinary.config({ 
  cloud_name: 'learntocodeinfo', 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET
});
```
6. Replace `cloud_name` with your cloud name from the cloudinary dashboard (after logging in to the account you created). 
7. Replace `api_key` and `api_secret` with your api key and secret from the cloudinary dashboard (use [ENV variables](https://github.com/motdotla/dotenv) to keep them secure)
8. Add upload.single('image') to your POST route's middleware chain:
```JS
router.post("/", middleware.isLoggedIn, upload.single('image'), function(req, res) {
```
9. Add the following cloudinary code to your POST route:
```JS
cloudinary.uploader.upload(req.file.path, function(result) {
  // add cloudinary url for the image to the photo object under image property
  req.body.photo.image = result.secure_url;
  // add author to photo
  req.body.photo.author = {
    id: req.user._id,
    username: req.user.username
  }
  photo.create(req.body.photo, function(err, photo) {
    if (err) {
      req.flash('error', err.message);
      return res.redirect('back');
    }
    res.redirect('/photos/' + photo.id);
  });
});
```
10. If you're using Google maps then you'll need to put all of the cloudinary code from above inside of the geocoder.geocode() callback. If you're not using Google maps then you can ignore this step.
11. I have only included code for creating photos, you'll have to implement editing photos on your own (for now)
