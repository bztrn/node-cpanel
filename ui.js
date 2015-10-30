/*
This file is part of node-cpanel.
Copyright (C) 2015  Artur Fogiel

node-cpanel is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

node-cpanel is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with node-cpanel.  If not, see <http://www.gnu.org/licenses/>.
*/

$( document ).ready(function() {
  var global_path = new Array("/", "home", "artur");
  /**
  * @fn send_cmd(cmd)
  * @param cmd <String> Command to execute
  */
  function send_cmd(cmd) {
    // Send the data using post
    var posting = $.post( "/nodeproxy/terminal", { c: encodeURI(cmd) } );
    // Put the results in a div
    posting.done(function( data ) {
      $( "#console_output_panel" ).empty().append( data );
    });
  }
  /**
  * @param path <String> Path to get files list from
  * @param clear <Bool> Clear destination dom element contents (True, False)
  */
  function get_files_list(path, clear) {
    if(clear == true) {
      $("#files_list").empty();
    }
    var posting = $.post( "/nodeproxy/files", { p: encodeURI(path) } );
    posting.done(function( data ) {
      data.forEach(function(entry) {
        addFileToList(entry.name, entry.type, entry.size);
      })
    });
  }
  /**
  * @fn addFileToList(filename, type, size)
  * @param filename <String> Name of directory/file
  * @param type <String> Type of element (dir, file)
  * @param size <String> Size of element in bytes/kilobytes/megabytes with unit
  */
  function addFileToList(filename, type, size) {
    var icon_class = "fa-folder-open"
    var middle_line = '<h4 class="list-group-item-heading">' + filename + '</h4>';
    if( type == "file" ) {
      icon_class = "fa-file";
    } else {
      middle_line = '<h4 class="list-group-item-heading" id="' + filename + '">' + filename + '</h4>';
    }

    // Prepare element to insert
    var list_item = '<a class="list-group-item">' +
        '<form method="POST" action="/nodeproxy/send_file"><i class="pull-left fa fa-2x ' + icon_class + '"/>' +
          middle_line +
          '<p class="list-group-item-text">' + size + '</p>' + 
          '<input type="hidden" name="f" value="' + encodeURI(global_path.join("/") + "/" + filename) + '"></input>' +
        '</form>' +
      '</a>';
    // Add element to list
    $("#files_list").append(list_item);
  }

  // @brief Name of currently viewed HTML file
  var current_filename = location.pathname.split('/').slice(-1)[0]
  ////////////////////////////////
  // HANDLERS file_manager.html //
  ////////////////////////////////
  if(current_filename == "file_manager.html") {
    $( "#btn_refresh" ).click(function( ) {
      get_files_list(global_path.join("/"), true)
    });

    $( "#btn_up" ).click(function( ) {
      global_path.pop();
      get_files_list(global_path.join("/"), true);
    });

    $("#download_name").click(function( ) {
      $(this).parent().submit();
    });

    $( "#btn_pack").click(function( ) {
      var files_to_pack_list = $("#archived_files_list").find("input[name='f']");
      //
      zip_files_list = new Array();
      for(var idx = 0; idx < files_to_pack_list.length; idx++) {
        zip_files_list.push(files_to_pack_list[idx].value);
      }

      var posting = $.post( "/nodeproxy/pack", { f: JSON.stringify(zip_files_list) } );
      posting.done(function( data ) {
        // Parse result
        if(data == "OK") {
          // Show div with link to archive
          $("#archive_div").show();
        }
      });
    });

    $( "#files_list" ).on('click', "h4", function( event ) {
      var id = event.target.id;
      if(id.length > 0) { // item is a folder
        global_path.push(event.target.id);
        get_files_list(global_path.join("/"), true);
      } else {
        var form = $(event.target).parent();
        form.submit();
      }
    });

    $( "#files_list" ).sortable({
      connectWith: ".connectedSortable",
      remove: function(event, ui) {
        ui.item.clone().appendTo("#archived_files_list");
        $(this).sortable('cancel');
      }
    }).disableSelection();

    $( "#archived_files_list" ).sortable({
      connectWith: ".connectedSortable"
    }).disableSelection();
  }
  ////////////////////////////
  // HANDLERS terminal.html //
  ////////////////////////////
  if(current_filename == "terminal.html") {
    $( "#send_cmd" ).click(function( ) {
      // Get some values from elements on the page:
      var $form = $( "#console_form" );
      var term = $form.find( "textarea[name='console_input']" ).val()
      
      send_cmd(term)
    });
  }
});