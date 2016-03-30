var Util = {  
    clone : function(obj) {
        if (obj == null || typeof (obj) != 'object'){
            return obj;
        }else if(obj.constructor == Date){
			return new Date(obj.getFullYear(), obj.getMonth(), obj.getDate(), obj.getHours(), obj.getMinutes(), obj.getSeconds(), obj.setMilliseconds());
		}
		
        var re = null;  
        if (obj.constructor==Array){
        	re = [];  
            for (var i=0; i<obj.length; i++ ){
            	re[i] = Util.clone(obj[i]);
            }
        }else{
        	re = {};
	        for (var i in obj) {
        		re[i] = Util.clone(obj[i]);  
	        }
        }
        return re;  
    }
};

//滚动分页
function ScrollPage(obj){
	//API 属性
	var view = null; 		// 数据视图
	var url = null; 		// 请求url
	var data = null; 		// 请求参数
	var row = null; 		// 行模板
	var size = 10; 			// 每页显示条数
	var columns = null; 	// [{"name":"list-data", reader:function(b 当前属性值, c 当前属性对应的元素, d 当前行数据, e 当前行元素)}] 各个值的特殊处理，返回true 继续设置值，false 将不再设置。传递5个参数 
	var success = null; 	//请求成功后调用的方法。
	var start = null; 		//请求开始调用的方法
	var end = null; 		//请求结束调用的方法，参数：(data:Array)
	var isload = true;		//初始化时是否查询

	//内部  属性
	var listId = null; 		//当前视图list-id属性
	var page = null; 		//当前第几页
	var maxPage = null; 	//最大页
	var quering = false;	//当前是否在查询中
	
	init(obj);
	function setAttributes(obj){
		if (!obj) return;
		if (obj.view){
			view = obj.view;			
			if (view.is("[list-id]")) listId = view.attr("list-id");
		}
		if (obj.url) url = obj.url;
		if (obj.data) data = obj.data;
		if (obj.size) size = obj.size;
		if (obj.row) row = obj.row;
		if (obj.columns) columns = obj.columns; 
		if (obj.success) success = obj.success;
		if (obj.start) start = obj.start;
		if (obj.end) end = obj.end;
		if (obj.isload != null) isload = obj.isload;

		if (obj.page) page = obj.page;
	};
	
	function init(obj){
		setAttributes(obj);
		scrollEvent();
		if (isload) query();
	};
	
	//查询
	function query(callback){
		if (quering) return;
		quering = true;
		if ($.isFunction(start)) start();
		
		var send = null;
		if (data == null) send = new Object();
		else send = Util.clone(data);

		page = page+1;
		//分页
		send["page"] = page; //第几页
		if (this.size) send["size"] = size; //每页条数
		
		$.ajax({
			url: url,
			type: "post",
			dataType: "json",
			data: send,
			success: function(d){
    			if (d.success){ 
		    		if ($.isFunction(success)) success();
		    		var data = d.model;
    				//设置数据
    				if (data != null && data.length > 0){
    		    		fillData(data); //填充数据
    				}else{
    					maxPage = page;
    				}  
		    		if ($.isFunction(end)) end(data);
    			}
    			
    			//query 方法回调函数提供给内部使用
	    		if ($.isFunction(callback)) callback();
	    		quering = false;
			}
		});
	};
	
	//填充数据
	function fillData(data){
		for (var i=0; i<data.length; i++){

			var r = row.clone();
			var index = size*(page-1)+i;
			r.attr("list-item",index);
			if (listId != null) r.attr("list-for", listId);
			var seq = r.find(filterExpress("[list-seq]"));
			if (seq.size() > 0) value(seq, index+1);
			
			setRowValue(r, data[i]);
			view.append(r);
		}
	};

	//获取行
	function getRowElement(key, value){
		return this.getElementByKv(key, value).closest("[list-item]");
	};
	
	//填充整行数据
	function setRowValue(rowTag, rowData){
		loopRowValue(rowTag, rowData);
	};

	//填充整行数据
	function loopRowValue(rowTag, rowData, parent, copyRowData){
		//copyRowData 保存为当前行的数据
		if (copyRowData == null){
			copyRowData = rowData;
		} 
		
		for (var tempListData in rowData) {
			var listData = tempListData;
			if (parent != null) {
				listData = parent+"_"+listData;
			}
			setElementValue(rowTag, listData, rowData[tempListData], copyRowData);
			if ($.isPlainObject(rowData[tempListData])) {
				loopRowValue(rowTag, rowData[tempListData], listData, copyRowData);
			}
		}
	};
	
	//填充单个属性值
	function setElementValue(rowTag, listData, val, rowData){
		var element = getElementAtRow(rowTag, listData);
		var bool = false;
		var resetVal = null;
		if ($.isArray(columns)){
			for (var i=0; i<columns.length; i++){
				if (columns[i].name == listData){
					if ($.isFunction(columns[i].reader)){
						bool = true; 
						resetVal = columns[i].reader(val, element.size() == 0 ? null : element, rowData);	
					}
					break;
				}
			}
		}
		
		if (element.size() > 0){
			if (typeof(resetVal) != "undefined" && resetVal != null){
				value(element, resetVal);
			}else if (!bool){
				value(element, val);
			}
		}
	};
	
	//获得属性值
	function getElementValue(r, k){
		var c = getElementAtRow(r, k);
		return value(c);
	};
	
	//设置属性值
	function value(comp, val){
		var c = comp;
		var v = val;
		
		if (arguments.length == 2){
			v = v == null ? "" : v;
			if (c.is("input[type=checkbox]") || c.is("input[type=radio]")) c.filter("[value="+v+"]").attr("checked","checked");
			else if (c.is("input") ||  c.is("textarea") ||  c.is("select")) c.val(v);
			else c.text(v);
		}else if (arguments.length == 1 ){
			if (c.is("input[type=checkbox]") || c.is("input[type=radio]")) return c.filter(":checked").val();
			else if (c.is("input") ||  c.is("textarea") ||  c.is("select")) return c.val();
			else return c.text();
		}
	}
	
	//获取所有行
	function getRows(){
		return view.find(filterExpress("[list-item]"));
	};
	
	//获取行总数
	function getRowCount(){
		return getRows().size();
	};

	//获取第一行
	function getFirstRow(){
		return getRows().first();
	};
	
	//获取最后一行
	function getLastRow(){
		return getRows().last();
	};
	
	//获取某一行下的元素
	function getElementAtRow(r, k){
		return r.find(filterExpress("[list-data="+k+"]"));
	};

	//获取某个属性等于值的元素
	function getElementByKv(k, v){
		return view.find(filterExpress("[list-data="+k+"][value="+v+"]"));
	};

	function isLast(){
		return (maxPage != null && maxPage == page);
	};
	
	function next(){
		query();
	};
	
	function reset(){
		if (view != null){
			getRows().remove();
		}
	};
	
	function clearData(){
		view.empty();
	};
	
	//过滤公共表达式，主要解决表格里面套表格的问题
	function filterExpress(sel){
		if (listId != null) sel =  sel + "[list-for="+listId+"]";
		else sel =  sel + ":not([list-for])";
		
		return sel;
	};
	
	function scrollEvent(){
		$(window).scroll(function(){
			if (!isLast()){
				var scrollTop = $(this).scrollTop();
				var scrollHeight = $(document).height();
				var windowHeight = $(this).height();
				if(scrollTop + windowHeight == scrollHeight){
					next();
				}
			}
		});
	};
	
	//---------------------外部对象调用---------------------------

	this.next = function(){
		next();
	};
	
	this.clear = function(){ //清空列表数据
		clearData();
	};
	
	//重新设置属性
	this.setProperties = function(obj){
		this.setAttributes(obj);
		return this;
	};
	
	//获取当前视图
	this.getView = function(){
		return this.view;
	};

	//获取当前参数
	this.getData = function(){
		return this.data;
	};
	
	//获取元素
	this.get = function(k, v, nk){
		return getElementAtRow(getRowElement(k,v), nk);
	};
	
	//更新行
	this.update = function(k, v, nval){
		setRowValue(getRowElement(k,v), nval);
	};
	
	//删除行
	this.remove = function(k, v, fn){
		var r = k;
		if (arguments.length > 1){
			r = getRowElement(k,v);
		}

		var seq = view.find(filterExpress("[list-seq]"));
		if (seq.size() > 0){
			var ind = value(seq);
			var cs = r.nextAll(filterExpr("[list-seq]"));
			for (var i=0; i<cs.size(); i++){
				var ctr = cs.eq(i);
				value(seq, parseInt(ind)+i);
			}
		}
		if ($.isFunction(fn)) fn(r);
		else r.remove();
	};
	
	this.after = function(obj){
		this.add(obj);
	};
	
	this.before = function(){
		this.add(obj,0);
	};
}