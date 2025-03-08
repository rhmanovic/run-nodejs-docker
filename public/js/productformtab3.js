$(document).ready(function(){
  // Function to add a new variation row
  function addVariationRow(variation) {
    var newRow = `<table class="table table-bordered table-striped table-hover mt-2">
                    <p>xxx</p>
                    <tbody>
                      <tr class="align-middle">
                        <td colspan="2">
                          <span>Original ID</span>
                          <div>
                            <input type="text" class="form-control" name="v_original_id[]" placeholder="Original ID" itsTab="tab3" value="${variation ? (variation.v_original_id ? variation.v_original_id : variation._id) : ''}">
                            <input type="text" class="form-control" name="" placeholder="Original ID" itsTab="tab3" value="${variation ? variation._id : ''}">
                          </div>
                          <span>الاسم انجليزي</span>
                          <div>
                            <input type="text" class="form-control" name="v_name_en[]" placeholder="الاسم انجليزي" required itsTab="tab3" value="${variation ? variation.v_name_en : ''}">
                            <span class="spanLocalError bg-danger text-white hidden">*إجباري</span>
                          </div>
                          <span>الاسم عربي</span>
                          <div>
                            <input type="text" class="form-control" name="v_name_ar[]" placeholder="الاسم عربي" required itsTab="tab3" value="${variation ? variation.v_name_ar : ''}">
                            <span class="spanLocalError bg-danger text-white hidden">*إجباري</span>
                          </div>
                          <span>اسم العلامة التجارية</span>
                          <div>
                            <input type="text" class="form-control" name="v_brand[]" placeholder="اسم العلامة التجارية" required itsTab="tab3" value="${variation ? variation.v_brand : ''}">
                            <span class="spanLocalError bg-danger text-white hidden">*إجباري</span>
                          </div>
                          <span>الضمان</span>
                          <div>
                            <input type="text" class="form-control" name="v_warranty[]" placeholder="الضمان" value="${variation ? variation.v_warranty : ''}">
                          </div>
                        </td>
                        <td>
                          <span>سعر البيع</span>
                          <div>
                            <input type="number" class="form-control" name="v_sale_price[]" placeholder="سعر البيع" step="0.001" required itsTab="tab3" value="${variation ? variation.v_sale_price : ''}">
                            <span class="spanLocalError bg-danger text-white hidden">*إجباري</span>
                          </div>
                          <span>تكلفة المنتج (إن وجدت)</span>
                          <input type="number" class="form-control" name="v_purchase_price[]" placeholder="تكلفة المنتج (إن وجدت)" step="0.001" value="${variation ? variation.v_purchase_price : ''}">
                        </td>
                        <td>
                          <span>كمية المخزون</span>
                          <input type="number" class="form-control" name="v_available_quantity[]" placeholder="الكمية المتاحة" value="${variation ? variation.v_available_quantity : ''}">
                          <span>حد الشراء</span>
                          <input type="number" class="form-control" name="v_purchase_limit[]" placeholder="حد الشراء" value="${variation ? variation.v_purchase_limit : ''}">
                          <span>باركود</span>
                          <input type="text" class="form-control" name="v_barcode[]" placeholder="باركود" value="${variation ? variation.v_barcode : ''}">
                          <span>المخزون في المستودع</span>
                          <input type="number" class="form-control" name="v_warehouse_stock[]" placeholder="المخزون في المستودع" value="${variation ? variation.v_warehouse_stock : ''}">
                          <span>عرض المنتج</span>
                            <div class="form-group mt-2">
                              <label for="v_show">Show Product</label>
                              <select name="v_show[]" class="form-control">
                                <option value="true" ${variation && variation.v_show ? 'selected' : ''}>True</option>
                                <option value="false" ${variation && !variation.v_show ? 'selected' : ''}>False</option>
                              </select>
                            </div>

                        </td>
                        <tr>
                          <td colspan="4">
                            <button type="button" class="btn btn-danger removeRow mb-0">حذف</button>
                          </td>
                        </tr>
                      </tr>
                    </tbody>
                  </table>`;
    $("#variationsContainer").append(newRow);
  }

  // Automatically add rows for existing variations
  if (productVariations && productVariations.length > 0) {
    productVariations.forEach(function(variation) {
      addVariationRow(variation);
    });
  }

  // Add row on button click
  $("#addRow").click(function(){
    addVariationRow();
  });

  // Function to remove a table
  $(document).on('click', '.removeRow', function(){
    $(this).closest('table').remove();
  });
});
