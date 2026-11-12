import { createImageUrlBuilder } from "@sanity/image-url";
import { sanity } from "@/lib/sanity";

export const image = createImageUrlBuilder(sanity);
