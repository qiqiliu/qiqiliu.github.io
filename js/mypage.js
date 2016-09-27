var t = n = 0, count;
$(document).ready(function () {
    count = $("#banner_list a").length;
    $("#banner_list a:not(:first-child)").hide();
    $("#banner_info").html($("#banner_list a:first-child").find("img").attr('alt'));
    $("#banner_info").click(function () {
        window.open($("#abanner_list a:first-child").attr('href'), "_blank")
    });
    $("#banner li").click(function () {
        var i = $(this).text() - 1;//获取Li元素内的值，即1，2，3，4
        n = i;
        if (i >= count) return;
        $("#banner_info").html($("#banner_list a").eq(i).find("img").attr('alt'));
        $("#banner_info").unbind().click(function () {
            window.open($("#banner_list a").eq(i).attr('href'), "_blank")
        });
        $("#banner_list a").filter(":visible").fadeOut(500).parent().children().eq(i).fadeIn(1000);
        document.getElementById("banner").style.background = "";
        $(this).toggleClass("on");
        $(this).siblings().removeAttr("class");
    });
    t = setInterval("showAuto()", 3000);
    // $("#banner").hover(function () {
    //     clearInterval(t)
    // }, function () {
    //     t = setInterval("showAuto()", 3000);
    // });


    $("#gotop1").click(function(e) {
    TweenMax.to(window, 1.5, {scrollTo:0, ease: Expo.easeInOut});
    var huojian = new TimelineLite();
    huojian.to("#gotop1", 1, {rotationY:720, scale:0.6, y:"+=40", ease:  Power4.easeOut})
    .to("#gotop1", 1, {y:-1000, opacity:0, ease:  Power4.easeOut}, 0.6)
    .to("#gotop1", 1, {y:0, rotationY:0, opacity:1, scale:1, ease: Expo.easeOut, clearProps: "all"}, "1.4");
   });
})
function showAuto() {
    n = n >= (count - 1) ? 0 : ++n;
    $("#banner li").eq(n).trigger('click');
    //浏览页图片轮播结束
}
