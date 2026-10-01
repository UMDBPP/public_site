/**
 * Sets up for using PhotoSwipe galleries on the page. Creates an importmap to translate the module imports to CDN URLs, creates link elements for the external CSS needed, and appends all of it 
 * to the document's head, so the modules work and the CSS is in the document.
 */
// This should run before the head finishes parsing (not deferred and called from the head)
function init_galleries() {
    function get_importmap() {
        let importmap_el = document.createElement('script');
        importmap_el.type = "importmap";
        importmap_el.appendChild(document.createTextNode(JSON.stringify({
            "imports": {
                "photoswipe": "https://unpkg.com/photoswipe@5.4.4/dist/photoswipe.esm.min.js",
                "photoswipe-lightbox": "https://unpkg.com/photoswipe@5.4.4/dist/photoswipe-lightbox.esm.min.js",
                "photoswipe-dynamic-caption": "https://unpkg.com/photoswipe-dynamic-caption-plugin@1.2.7/dist/photoswipe-dynamic-caption-plugin.esm.min.js"
            }
        })));
        return importmap_el;
    }

    function get_css(url) {
        let link_el = document.createElement('link');
        link_el.href = url;
        link_el.rel = 'stylesheet';
        link_el.type = 'text/css';
        return link_el;
    }

    document.head.appendChild(get_importmap());
    document.head.appendChild(get_css("https://unpkg.com/photoswipe@5.4.4/dist/photoswipe.css"));
    document.head.appendChild(get_css("https://unpkg.com/photoswipe-dynamic-caption-plugin@1.2.7/photoswipe-dynamic-caption-plugin.css"));
}



/**
 * Creates the gallery HTML for sheet-controlled galleries on the page. Sheet-controlled galleries are determined by their CSS classes:
 *      .gallery        - Identifies the div as a gallery
 *      .home_seen      - Identifies the gallery as the "What We've Seen" gallery on the home page controlled by the corresponding sheet
 *      .payloads       - Identifies the gallery as a gallery of payloads controlled by the "Payloads" sheet
 *      .active         - Sets the payloads gallery to only display payloads marked as active ("Active" column checked)
 *      .inactive       - Sets the payloads gallery to only display payloads marked as inactive ("Active" column unchecked)
 * 
 * This function get the gallery elements from the page, fetches a CSV of the relevant published Google Sheet, and uses the resulting data to create the gallery items to then insert
 * into the galleries. While this is a fair bit more complicated and difficult than just embedding the sheet, doing it like this lets us do whatever we want with the formatting on the
 * webpage (in this case making a gallery out of it) and still lets us control and edit it almost entirely from the sheet (so it has a chance of staying somewhat up-to-date and can be
 * updated independently of the website).
 * 
 * References:
 * https://stackoverflow.com/a/70902774 - Accessing a sheet using the Google Charts Visualization API. Below logic is loosely based off the HTML page example here
 * https://stackoverflow.com/a/62933812 - Directly downloading a published Google Sheet. This answer is for an XLSX file, but CSV is easier to work with
 * https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch - Using fetch() to get a file
 * https://csv.js.org/parse/api/sync/ - Synchronous API example for the CSV parser
 * https://csv.js.org/parse/options/ - Options documentation for the CSV parser
 * https://stackoverflow.com/a/8125327 - Setting an image placeholder
 */
// This should run after the page finishes parsing (deferred or just at the end of the page tags)
async function create_sheet_controlled_galleries(){
    let home_seen_gallery_elements = document.getElementsByClassName("gallery home_seen");
    let payload_gallery_elements = document.getElementsByClassName("gallery payloads");

    // Not the ID of the editable spreadsheet. The one for the published sheets
    const sheet_public_id = "2PACX-1vQIacXD50Gp2CT76XQ1yXGBNeaNFfVvER0UmjuP6kvQeyZkX8v45TRLX0Uyobu8yPVcfvgwBrWkhUL7";
    // URL to fetch from. Append sheet GID to end to get that sheet
    const sheet_url = "https://docs.google.com/spreadsheets/d/e/" + sheet_public_id + "/pub?output=csv&gid=";
    // GID of each sheet
    const payloads_gid = "0";
    const seen_gallery_gid = "112354505";

    // Declare common variables used below
    let response, sheet_csv, gallery_html, aspect_ratio, onerror_thumb, onerror_img;
    const csv_parse = await import("https://unpkg.com/csv-parse@5.6.0/dist/esm/sync.js");

    try {
        if(home_seen_gallery_elements.length > 0){
            response = await fetch(sheet_url + seen_gallery_gid);
            if (!response.ok) {
                throw new Error(`Response status: ${response.status}`);
            }

            sheet_csv = csv_parse.parse(await response.text(), {
                columns: true,
                skip_empty_lines: true
            });
            // console.log(sheet_csv);

            // Loop through the sheet rows and assemble the gallery HTML
            gallery_html = "";
            for(let row_idx = 0, row_count = sheet_csv.length; row_idx < row_count; row_idx++){
                let sheet_row = sheet_csv[row_idx];
                if(sheet_row["Image"] != ""){
                    aspect_ratio = Math.round(sheet_row["Image Height"] / sheet_row["Image Width"] * 10) / 10; // Rounded to one decimal

                    // Image thumbnails have the same filename, but with _thumb appended
                    // Check if a thumbnail file exists and use it if it does and use the original image if it does not
                    let thumb_file = sheet_row["Image"].split(".");
                    // thumb_file = thumb_file.with(-2, thumb_file.at(-2) + "_thumb").with(-1, "avif").join(".");
                    thumb_file = thumb_file.with(-2, thumb_file.at(-2) + "_thumb").with(-1, "jpg").join(".");
                    // try {
                    //     await fetch("assets/images/" + thumb_file, {"method":"HEAD"}).then((thumb_response) => {
                    //         if(!thumb_response.ok){
                    //             thumb_file = sheet_row["Image"];
                    //         }
                    //     });
                    // } catch (error) {
                    //     console.log(error.message);
                        // thumb_file = sheet_row["Image"];
                    // }

                    gallery_html +=                                                                     // Don't row span the last 10 items
                    `<div class="gallery_item"` + (aspect_ratio > 1.3 ? `style="grid-row: auto / span ` + (row_idx < sheet_csv.length - 10 ? (aspect_ratio > 1.7 ? `3;"` : `2;"`) : `1;"`) : ``) + `>` + 
                        `<a href="assets/images/` + sheet_row["Image"] + `" target="_blank" data-pswp-width=` + sheet_row["Image Width"] + ` data-pswp-height=` + sheet_row["Image Height"] + `">` +
                            `<figure class="gallery_fig">` +
                                `<img src="assets/images/` + thumb_file + `" alt="" loading=lazy onerror='this.src="assets/images/` + sheet_row["Image"] + `";this.onerror=null;'>` +
                                `<figcaption><div class="caption_title">` + sheet_row["Flight"] + (sheet_row["Date"] ? `<span style="float: right;"> [` + sheet_row["Date"] + `]</span>` : ``) + `</div><br><div class="caption_text">` + sheet_row["Caption"] + `</div></figcaption>` +
                            `</figure>` +
                        `</a>` +
                        `<div class="lightbox_text">` +
                            `<h2>` + sheet_row["Flight"] + (sheet_row["Date"] ? `<br>[` + sheet_row["Date"] + `]` : ``) + `</h2>` +
                            `<p>` + (sheet_row["Description"] != "" ? sheet_row["Description"] : sheet_row["Caption"]) + `</p>` +
                            (sheet_row["Attribution"] != "" ? `<p>Image by ` + sheet_row["Attribution"] + `</p>` : "") +
                        `</div>` +
                    `</div>`;
                }
            }

            // Loop through the gallery divs and replace each of their inner HTMLs with the gallery HTML
            for(let i = 0; i < home_seen_gallery_elements.length; i++) {
                home_seen_gallery_elements[i].innerHTML = gallery_html;
                // console.log(home_seen_gallery_elements[i]);
            }
        }

        if(payload_gallery_elements.length > 0){
            response = await fetch(sheet_url + payloads_gid);
            if (!response.ok) {
                throw new Error(`Response status: ${response.status}`);
            }

            sheet_csv = csv_parse.parse(await response.text(), {
                columns: true,
                skip_empty_lines: true
            });
            // console.log(sheet_csv);

            // Loop through the sheet rows and assemble the gallery HTML
            // (We get active and inactive from the same sheet so assemble both regardless of whether both are used)
            gallery_html = "";
            let gallery_active = "";
            let gallery_inactive = "";
            let gallery_temp = "";
            sheet_csv.forEach(sheet_row => {
                if(sheet_row["Name"] != ""){
                    // Image thumbnails have the same filename, but with _thumb appended
                    // Check if a thumbnail file exists and use it if it does and use the original image if it does not
                    let thumb_file = sheet_row["Image"].split(".");
                    thumb_file = thumb_file.with(-2, thumb_file.at(-2) + "_thumb").with(-1, "jpg").join(".");

                    gallery_temp =  
                    `<div class="gallery_item">` + 
                        `<a href="assets/images/` + sheet_row["Image"] + `" target="_blank" data-pswp-width=` + sheet_row["Image Width"] + ` data-pswp-height=` + sheet_row["Image Height"] + `">` +
                            `<figure class="gallery_fig">` +
                                `<img src="assets/images/` + thumb_file + `" alt="" loading=lazy onerror='this.src="assets/images/` + sheet_row["Image"] + `";this.onerror=null;'>` +
                                `<figcaption><span class="caption_title">` + sheet_row["Short Name"] + `</span><br><span class="caption_text">` + sheet_row["Description"] + `</span></figcaption>` +
                            `</figure>` +
                        `</a>` +
                        `<div class="lightbox_text">` +
                            `<h2>` + sheet_row["Short Name"] + `</h2>` +
                            (sheet_row["Full Name"] != "" ? `<h3>` + sheet_row["Full Name"] + `</h3>` : ``) +
                            `<p>` + sheet_row["Description"] + `</p>` +
                            (sheet_row["Flights"] != "" ? `<p>Flown Flights:<br>` + sheet_row["Flights"] + `</p>` : ``) +
                            (sheet_row["Image Location"] != "" ? `<p>Image taken from ` + sheet_row["Image Location"] + `</p>` : ``) +
                            (sheet_row["Attribution"] != "" ? `<p>Image by ` + sheet_row["Attribution"] + `</p>` : ``) +
                        `</div>` +
                    `</div>`;

                    gallery_html += gallery_temp;

                    if(sheet_row["Active"] == "TRUE"){
                        gallery_active += gallery_temp;
                    } else{
                        gallery_inactive += gallery_temp;
                    }
                }
                
            });

            // Loop through the gallery divs and replace each of their inner HTMLs with the gallery HTML
            for(let i = 0; i < payload_gallery_elements.length; i++) {
                if(payload_gallery_elements[i].classList.contains("active")){
                    payload_gallery_elements[i].innerHTML = gallery_active;
                } else if(payload_gallery_elements[i].classList.contains("inactive")){
                    payload_gallery_elements[i].innerHTML = gallery_inactive;
                } else{
                    payload_gallery_elements[i].innerHTML = gallery_html;
                }
                // console.log(payload_gallery_elements[i]);
            }
        }

    } catch(error) {
        console.error(error.message);
    }
}