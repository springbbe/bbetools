/* Từ, cụm từ tiếng Việt ngắn, thông dụng, dễ hình dung — dùng sinh cụm mật khẩu dễ nhớ (passphrase).
   Viết có dấu để gợi nhớ; khi ghép vào mật khẩu sẽ bỏ dấu. Danh sách được lọc trùng sau khi bỏ dấu (xem mat-khau.js). */
export const TU = (
  // thiên nhiên
  "mặt trời,mặt trăng,ngôi sao,bầu trời,đám mây,cơn mưa,ngọn gió,sấm sét,cầu vồng,sương mù,tuyết trắng,băng giá,bình minh,hoàng hôn," +
  "dòng sông,con suối,thác nước,hồ nước,biển cả,đại dương,hòn đảo,bãi cát,vách đá,ngọn núi,đồi thông,thung lũng,cánh đồng,rừng xanh," +
  "đầm lầy,sa mạc,núi lửa,hang động,mỏm đá,ghềnh thác,cồn cát,bờ biển,mũi đất,vịnh nhỏ,con sóng,thủy triều,dòng chảy,mạch nước," +
  "lá phong,hoa sen,hoa đào,hoa mai,hoa cúc,hoa hồng,hoa lan,hoa huệ,hoa sữa,hoa ban,hoa súng,hoa giấy,hoa phượng,hoa bưởi,hoa móng," +
  "cây tre,cây đa,cây bàng,cây thông,cây dừa,cây cau,cây xoài,cây mít,cây ổi,cây sung,cây gạo,cây liễu,cây sồi,cây bách,cỏ may,rêu xanh," +
  "lúa chín,bông lúa,hạt thóc,rơm rạ,củ khoai,củ sắn,hạt dẻ,quả thông,hạt sen,bông gòn,cây nấm,dây leo,mầm non,chồi non,búp sen,nụ hồng," +
  // con vật
  "con mèo,con chó,con gà,con vịt,con ngan,con ngỗng,con bò,con trâu,con lợn,con dê,con cừu,con ngựa,con thỏ,con chuột,con sóc,con nhím," +
  "con hổ,con báo,con sư tử,con voi,con khỉ,con gấu,con hươu,con nai,con cáo,con sói,con chồn,con rái cá,con dơi,con tê giác,con hà mã," +
  "con cá,con tôm,con cua,con ốc,con sò,con hến,con mực,con bạch tuộc,cá heo,cá voi,cá mập,cá chép,cá vàng,cá rô,cá trê,cá thu,sao biển," +
  "con chim,chim sẻ,chim én,chim cú,chim ưng,đại bàng,chim công,chim sáo,họa mi,chích chòe,bồ câu,hải âu,con cò,con vạc,con diệc,chim cánh cụt," +
  "con ong,con bướm,chuồn chuồn,con ve,con dế,con kiến,đom đóm,bọ rùa,con nhện,con ếch,con nhái,con rùa,con rắn,thằn lằn,cá sấu,con sứa," +
  // đồ vật trong nhà
  "cái bàn,cái ghế,cái tủ,cái giường,cái gối,tấm chăn,chiếu cói,rèm cửa,cửa sổ,cánh cửa,cầu thang,mái nhà,ban công,sân thượng,góc bếp," +
  "cái nồi,cái chảo,cái bát,cái đĩa,đôi đũa,cái thìa,cái muỗng,cái ấm,chén trà,ly cà phê,cái cốc,bình hoa,chậu cây,cái giỏ,cái làn," +
  "chiếc gương,cái lược,bàn chải,khăn mặt,xà phòng,cái quạt,bóng đèn,ngọn nến,đèn lồng,chiếc ô,cái nón,mũ len,khăn quàng,áo khoác,đôi giày," +
  "đôi dép,đôi tất,găng tay,cái túi,ba lô,va li,chiếc ví,đồng hồ,chiếc nhẫn,vòng tay,dây chuyền,khuy áo,cái kéo,cây kim,cuộn chỉ,sợi len," +
  "cái búa,cái đinh,cái cưa,tua vít,cái kìm,thước kẻ,cái thang,cái xô,cái chổi,cây lau,cái thớt,con dao,cái kẹp,sợi dây,cái móc,chìa khóa," +
  "ổ khóa,hộp thư,phong bì,con tem,tấm thiệp,lá thư,cuốn sổ,cuốn sách,trang giấy,cây bút,bút chì,cục tẩy,hộp màu,giá vẽ,bức tranh,khung ảnh," +
  "cái đàn,cây sáo,trống cơm,chiếc kèn,đàn bầu,đàn tranh,đàn nguyệt,cái chuông,cái còi,quả bóng,con diều,con quay,búp bê,xe đẩy,cái nôi,bập bênh," +
  // phương tiện, nơi chốn
  "xe đạp,xe máy,ô tô,xe buýt,tàu hỏa,tàu thủy,máy bay,khinh khí cầu,thuyền buồm,con đò,chiếc bè,ca nô,xích lô,xe ngựa,trực thăng,tên lửa," +
  "con đường,ngã tư,cây cầu,bến xe,nhà ga,sân bay,bến cảng,ngọn hải đăng,cột mốc,trạm dừng,lối đi,hẻm nhỏ,đại lộ,quảng trường,công viên,vườn hoa," +
  "làng quê,phố cổ,thị trấn,thành phố,thủ đô,bản làng,mái đình,ngôi chùa,nhà thờ,lâu đài,cung điện,tòa tháp,pháo đài,thành cổ,giếng làng,cây đa đầu làng," +
  "trường học,lớp học,thư viện,bảo tàng,nhà hát,rạp phim,sân khấu,khu chợ,siêu thị,tiệm bánh,quán cà phê,nhà hàng,tiệm sách,hiệu thuốc,bệnh viện,bưu điện," +
  "nông trại,vườn rau,ao cá,chuồng gà,kho thóc,cối xay,giếng nước,bờ ao,lũy tre,cổng làng,bến nước,mương nước,ruộng bậc thang,đồi chè,vườn cam,rẫy ngô," +
  // món ăn
  "bánh mì,bánh chưng,bánh tét,bánh cuốn,bánh xèo,bánh bao,bánh flan,bánh quy,bánh đa,bánh giò,bánh khọt,bánh bèo,bánh ít,bánh da lợn,bánh trôi,bánh pía," +
  "phở bò,bún chả,bún bò,bún riêu,bún ốc,mì quảng,hủ tiếu,cao lầu,cơm tấm,cơm rang,xôi gấc,xôi xéo,cháo gà,lẩu thái,gỏi cuốn,nem rán," +
  "chả giò,chả cá,thịt kho,canh chua,cá kho,rau muống,dưa hấu,dưa chuột,quả chuối,quả cam,quả quýt,quả bưởi,quả na,quả vải,quả nhãn,chôm chôm," +
  "măng cụt,sầu riêng,thanh long,mãng cầu,quả lê,quả táo,quả đào,quả mận,quả dâu,quả nho,quả dừa,quả bơ,quả chanh,quả khế,quả me,quả sấu," +
  "trà sữa,nước mía,sữa đậu,chè đậu,chè bưởi,kem dừa,sữa chua,mật ong,đường phèn,muối vừng,nước mắm,tương ớt,hạt tiêu,củ gừng,củ tỏi,hành lá," +
  "rau thơm,lá chanh,lá lốt,tía tô,kinh giới,húng quế,ngò gai,bạc hà,quả ớt,quả cà,bí đỏ,bí xanh,mướp đắng,củ cải,cà rốt,khoai tây," +
  // con người, việc làm
  "bác sĩ,y tá,giáo viên,học sinh,sinh viên,kỹ sư,kiến trúc,họa sĩ,nhạc sĩ,ca sĩ,diễn viên,đầu bếp,thợ may,thợ mộc,thợ điện,nông dân," +
  "ngư dân,phi công,thủy thủ,du khách,hướng dẫn,thủ thư,nhà văn,nhà thơ,phóng viên,nhiếp ảnh,lập trình,thiết kế,kế toán,luật sư,cảnh sát,lính cứu hỏa," +
  "ông bà,bố mẹ,anh chị,em bé,cô dâu,chú rể,hàng xóm,bạn thân,đồng nghiệp,thầy cô,cháu nội,ông ngoại,bà nội,cậu bé,cô bé,chú lính," +
  // hoạt động
  "đọc sách,viết thư,vẽ tranh,ca hát,nhảy múa,chạy bộ,bơi lội,leo núi,đạp xe,câu cá,cắm trại,du lịch,nấu ăn,làm bánh,trồng cây,tưới hoa," +
  "đá bóng,cầu lông,bóng chuyền,bóng rổ,quần vợt,cờ vua,cờ tướng,thả diều,nhảy dây,trốn tìm,kéo co,đánh đu,ném còn,đua thuyền,múa lân,hát chèo," +
  "học bài,làm việc,nghỉ ngơi,ngủ trưa,dạo phố,ngắm cảnh,chụp ảnh,quay phim,nghe nhạc,xem phim,đi chợ,dọn nhà,giặt đồ,là áo,may vá,đan len," +
  // tính từ, trạng thái
  "xanh lam,xanh lục,đỏ thắm,vàng tươi,tím biếc,hồng nhạt,trắng tinh,đen nhánh,nâu sẫm,cam đậm,bạc trắng,lấp lánh,rực rỡ,óng ánh,trong veo,mát lạnh," +
  "ấm áp,dịu dàng,nhẹ nhàng,vui vẻ,hạnh phúc,bình yên,thong thả,chăm chỉ,cần cù,dũng cảm,thông minh,nhanh nhẹn,khéo léo,hiền lành,thật thà,tốt bụng," +
  "rộn ràng,lặng lẽ,náo nhiệt,yên tĩnh,mênh mông,bao la,cao vút,sâu thẳm,rộng lớn,nhỏ xinh,tròn trịa,vuông vức,mềm mại,cứng cáp,giòn tan,thơm phức," +
  "ngọt ngào,chua cay,mặn mà,đậm đà,thanh mát,tươi mới,sạch sẽ,gọn gàng,xinh xắn,dễ thương,đáng yêu,lém lỉnh,tinh nghịch,hồn nhiên,ngây thơ,trầm tư," +
  // thời gian, mùa, lễ
  "mùa xuân,mùa hạ,mùa thu,mùa đông,buổi sáng,buổi trưa,buổi chiều,buổi tối,nửa đêm,rạng đông,chạng vạng,cuối tuần,ngày mai,hôm qua,năm mới,giao thừa," +
  "tết đến,trung thu,rằm tháng,mùng một,lễ hội,phiên chợ,đêm hội,pháo hoa,đèn ông sao,mâm ngũ quả,cành đào,cây quất,lì xì,câu đối,bánh dẻo,đèn kéo quân," +
  // khái niệm
  "ước mơ,niềm vui,nụ cười,giọt nước,giấc mơ,kỷ niệm,câu chuyện,bài hát,giai điệu,nhịp điệu,vần thơ,trang sử,bản đồ,la bàn,hành trình,chặng đường," +
  "phép màu,bí mật,kho báu,câu đố,trò chơi,phần thưởng,chiến thắng,lá cờ,ngọn đuốc,ngọn lửa,tia chớp,vì sao,dải ngân hà,hành tinh,vũ trụ,phi thuyền," +
  "máy tính,điện thoại,bàn phím,con chuột,màn hình,tai nghe,máy ảnh,loa nhỏ,ổ cứng,thẻ nhớ,cục pin,bộ sạc,dây cáp,ăng ten,rô bốt,vệ tinh," +
  "kim cương,hồng ngọc,ngọc trai,ngọc bích,thạch anh,hổ phách,đồng xu,thỏi vàng,hạt cườm,vỏ sò,san hô,đá cuội,viên bi,con xúc xắc,quân bài,mảnh ghép"
).split(",").map((s) => s.trim()).filter(Boolean);
