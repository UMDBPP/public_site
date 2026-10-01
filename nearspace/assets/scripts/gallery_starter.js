import PhotoSwipe from "photoswipe";
import PhotoSwipeLightbox from "photoswipe-lightbox";
import PhotoSwipeDynamicCaption from "photoswipe-dynamic-caption";

const lightbox = new PhotoSwipeLightbox({
    gallery: ".gallery",
    children: ".gallery_item",
    pswpModule: PhotoSwipe,
    paddingFn: (viewportSize) => {
        return {
        top:    0.03*viewportSize.y,
        bottom: 0.03*viewportSize.y,
        left:   0.03*viewportSize.x,
        right:  0.03*viewportSize.x
        }
    },
});

const lightbox_caption_plugin = new PhotoSwipeDynamicCaption(lightbox, {
    type: "auto",
    captionContent: ".lightbox_text"
});

lightbox.init();