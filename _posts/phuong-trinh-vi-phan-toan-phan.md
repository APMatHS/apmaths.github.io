---
layout: post
title: Phương trình vi phân toàn phần
tags: "Calculus","Giải tích"
date: 2023-12-20
---
<h2 id="tan-man">1. Tản mạn</h2>
<p>Trời thì đang mưa rất là to, sáng ngủ dậy làm được gói mỳ tôm, nhai thêm hai cái bánh chocolate và làm thêm cốc nước nữa kakaka... đủ năng lượng cho một buổi sáng. Tiếng mưa vẫn rơi rả rích trên mái nhà, ngay lúc này đây, được ngồi một mình ngâm cứu một thứ gì đó thì quả thật không còn gì bằng. Làm thêm một ngụm nước, kê bàn và lật sách phương trình vi phân ra đọc. Chà ngay lúc này, cũng có một cảm nhận gì đó tí tẹo về phương trình vi phân toàn phần, tạm thời viết một bài nhỏ ở đây, có khi giờ nhớ đấy, nhưng vài hôm nữa lại quên ngay...</p>
<p>Đầu tiên CaolacVC sẽ trình bày tóm gọn nhất về dạng và cách giải và sau đó là đưa ra ví dụ, để khi cần thì chỉ cần mở ra nhớ và làm, cái này giống như là delta của phương trình bậc hai, nhớ và làm thôi, còn việc ngâm cứu chuyên sâu như thế nào đó là nhu cầu của mỗi người. OK! Let's Go!</p>
</div>


<hr><!-------------------------------------------------->
<div><!----------------DẠNG CỦA PHƯƠNG TRÌNH VI PHÂN TOÀN PHẦN------------->
<h2 id="dang">2. Dạng phương trình vi phân toàn phần</h2>
<div class="dn">
  <p>Phương trình vi phân dạng</p>
  <p>$$M(x,y)dx+N(x,y)dy=0\quad (1)$$</p>
  <p>được gọi là <code>phương trình vi phần toàn phần</code> khi nó thỏa mãn điều kiện: vế trái của phương trình $(1)$ phải là vi phân toàn phần của một hàm khả vi nào đó. Tức là tồn tại một hàm $U(x,y)$ khả vi nào đó sao cho</p>
  <p>$$dU(x,y)=M(x,y)dx+N(x,y)dy$$</p>
  <p>Điều kiện để một phương trình vi phân dạng $(1)$ trở thành phương trình vi phân toàn phần (hay cách nhận biết phương trình vi phân toàn phần) là:</p>
  <p>$$\displaystyle \frac{\partial M}{\partial y}=\frac{\partial N}{\partial x}$$</p>
</div>
<p><b>Ví dụ.</b> Phương trình vi phân $(3x^2+6xy^2)dx+(6x^2y+4y^3)dy$  là phương trình vi phân toàn phần vì</p>
<p>$M(x,y)=(3x^2+6xy^2), N(x,y)=(6x^2y+4y^3)$</p>
<p>$\displaystyle \frac{\partial M}{\partial y}=\frac{\partial N}{\partial x}=12xy$</p>
</div>

<hr>

<div><!-------------------CÁCH GIẢI-------------------->
<h2 id="cach-giai">3. Cách giải</h2>
<p>Ở đây ta chỉ nêu cách giải và áp dụng, nên mới nói là nó cũng như công thức delta mà thôi. Việc tìm hiểu thêm là nhu cầu của mỗi người.</p>
<div class="dl">
  <p>Nếu phương trình $(1)$ là phương trình vi phân toàn phần thì tích phân tổng quát của phương trình $(1)$ là:</p>
  <p>$$\displaystyle U(x,y)=\int_{x_0}^{x}M(x,y_0)dx+\int_{y_0}^{y}N(x,y)dy=C\quad (2.1)$$</p>
  <p>hoặc</p>
  <p>$$\displaystyle U(x,y)=\int_{x_0}^{x}M(x,y)dx+\int_{y_0}^{y}N(x_0,y)dy=C \quad (2.2)$$</p>
  <p>với $(x_0,y_0)$ là một điểm điểm bất kỳ mà khi thay vào các hàm $M(x,y_0), N(x_0,y)$ xác định. Thường thì ta sẽ chọn sao cho thuận tiện trong việc tính tích phân nhất.</p>
</div>
<div class="dl">
  <p>Cách nhớ của CaolacVC: Công thức này cực kỳ dễ nhớ nếu ta để ý một chút. Trước tiên một cách hình thức ta lấy tích phân hai vế của của phương trình $(1)$, lưu ý chỗ có đuôi vi phân là $dx$ thì cận chạy từ $x_0$ đến $x$, chỗ có phần đuôi là $dy$ thì cận chạy từ $y_0$ đến $y$.</p>
  <p>Điều quan trọng nhất là hãy nhớ chỉ được thay $x_0$ hoặc $y_0$ vào <span style="color:red">một trong hai</span> vị trí: phần có đuôi $dx$ thì chỉ được thay $y_0$. Phần có đuôi $dy$ thì chỉ được thay $x_0$.</p>
</div>
</div>



<hr>
<div><!-----------------------VÍ DỤ ÁP DỤNG------------------>
<h2 id="vi-du">4. Ví dụ áp dụng</h2>
<p>Ví dụ luôn là thứ giải đáp mọi thắc mắc mà phần lý thuyết nếu đọc ta vẫn chưa nắm vững.</p>
<div class="bt">
  <p><b>Ví dụ 1.</b> Giải phương trình:</p>
  <p>$$(3x^2+6xy^2)dx+(6x^2y+4y^3)dy \quad (3.1)$$</p>
</div>
<p>Trước tiên ta phải kiểm tra điều kiện để phương trình đã cho là phương trình vi phân toàn phần hay không. Nếu có thì ta mới áp dụng được công thức của bài viết này, nếu không thì bài viết này coi như vứt, chẳng giúp ích được gì. (Mách nhỏ là ở trên, lúc nãy hình như kiểm tra là phương trình vi phân toàn phần rồi hay sao đó)</p>
<p>$M(x,y)=(3x^2+6xy^2), N(x,y)=(6x^2y+4y^3)$</p>
<p>$\displaystyle \frac{\partial M}{\partial y}=\frac{\partial N}{\partial x}=12xy$</p>
<p>Vậy $(3.1)$ là phương trình vi phân toàn phần. Ta chọn $(x_0;y_0)=(0,0)$. Khi đó theo công thức $(2.2)$ ta được</p>
<p>$\displaystyle \int_{0}^{x}(3x^2+6xy^2)dx+\int_{0}^{y}4y^3dy=C$</p>
<p>Hay tích phân tổng quát của $(3.1)$ là</p>
<p>$x^3+3x^2y^2+y^4=C$</p>
</div>


<hr>
<h2 id="bai-tap">Một số bài tập có lời giải</h2>

<div class="bt">
  <p><b>Bài tập 1.</b> Giải phương trình $$(y-x)dx+(y^3+x)dy=0$$</p>
</div>
<p>$M(x;y)=y-x$</p>
<p>$N(x;y)=y^3+x$</p>
<p>$\dfrac{\partial M}{dy}=\dfrac{\partial N}{dx}=1$ (thỏa mãn điều kiện của phương trình vi phân toàn phần)</p>
<p>Chọn $(x_0;y_0)=(0;0)$. Tích phân tổng quát</p>
<p>$\displaystyle \int_0^x (0-x)dx+\int_0^y (y^3+x)dy=C$</p>
<p>$\displaystyle \Rightarrow \int_0^x(-x)dx+\int_0^y (y^3+x)dy=C$</p>
<p>$\displaystyle \Rightarrow -\frac{x^2}{2}+\frac{y^4}{4}+xy=C$</p>


<div class="bt">
  <p><b>Bài tập 2.</b> Giải phương trình $$\left[ \left( 1+x+y \right){{e}^{x}}+{{e}^{y}} \right]dx+\left( {{e}^{x}}+x{{e}^{y}} \right)dy=0$$</p>
</div>
<p>$\displaystyle M(x;y)=(1+x+y){{e}^{x}}+{{e}^{y}}$</p>
<p>$\displaystyle N(x;y)={{e}^{x}}+x{{e}^{y}}$</p>
<p>$\displaystyle \frac{\partial M}{dy}=\frac{\partial N}{dx}={{e}^{x}}$</p>
<p>Chọn $({{x}_{0}};{{y}_{0}})=(0;0)$</p>
<p>Suy ra tích phân tổng quát</p>
<p>$\displaystyle \int\limits_{0}^{x}{\left[ (1+x+0){{e}^{x}}+{{e}^{0}} \right]dx}+\int\limits_{0}^{y}{\left( {{e}^{x}}+x{{e}^{y}} \right)dy}=C$</p>
<p>$\displaystyle \Leftrightarrow \int\limits_{0}^{x}{\left[ (1+x){{e}^{x}}+1 \right]dx}+\int\limits_{0}^{y}{\left( {{e}^{x}}+x{{e}^{y}} \right)dy}=C$</p>
<p>$\displaystyle \Leftrightarrow \left[ (1+x){{e}^{x}}-{{e}^{x}}+x \right]\left| _{0}^{x} \right.+\left( y{{e}^{x}}+x{{e}^{y}} \right)\left| _{0}^{y} \right.=C$</p>
<p>$\displaystyle \Leftrightarrow {{e}^{x}}(x+y)+x{{e}^{y}}=C$</p>