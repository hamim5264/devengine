import {type ProjectItem,DEFAULT_YOUTUBE_URL,DEFAULT_SNAPSHOT,DEFAULT_WHATS_INCLUDED,DEFAULT_NOT_INCLUDED,DEFAULT_FAQS} from "@/types/project";
export function normalizePublicProject(id:string,data:Record<string,any>):ProjectItem {return {
              id: id,
              slug: data.slug || id,
              title: data.title || "Untitled System",
              subtitle: data.subtitle || "",
              category: (data.category || "General"),
              price: data.price ?? "0",
              discount: data.discount,
              pricing: Array.isArray(data.pricing) ? data.pricing : undefined,
              tags: Array.isArray(data.tags) ? data.tags : [],
              tools: Array.isArray(data.tools) ? data.tools : [],
              isPublic: data.isPublic !== false,
              images:
                Array.isArray(data.images) && data.images.length > 0
                  ? data.images
                  : (data.imageUrl || data.image ? [data.imageUrl || data.image] : []),
              imageUrl: data.imageUrl || data.image || "",
              image: data.imageUrl || data.image || "",
              details: data.details || "",
              installation: data.installation || "",
              youtubeUrl: data.youtubeUrl || DEFAULT_YOUTUBE_URL,
              version: data.version || "2.4.0",
              platform: data.platform || "Cross-Platform",
              status: data.status || "Active",
              releaseDate: data.releaseDate || "Q4 2024",
              buildStack: data.buildStack || "",
              availability: data.availability || "iOS, Android, Web",
              snapshot: data.snapshot || DEFAULT_SNAPSHOT,
              story: {
                idea:
                  data.story?.idea ||
                  data.details ||
                  "Engineered to bridge complex production requirements with fluid, modern interfaces.",
                problem:
                  data.story?.problem ||
                  "Building enterprise-ready architectures from scratch requires months of boilerplate engineering and performance tuning.",
                solution:
                  data.story?.solution ||
                  "A pre-architected, modular system with clean separation of concerns, secure data access, and instant cloud deployment.",
                value:
                  data.story?.value ||
                  "Eliminate hundreds of development hours, save substantial engineering costs, and launch within hours.",
              },
              whatsIncluded:
                Array.isArray(data.whatsIncluded) && data.whatsIncluded.length > 0
                  ? data.whatsIncluded
                  : DEFAULT_WHATS_INCLUDED,
              notIncluded:
                Array.isArray(data.notIncluded) && data.notIncluded.length > 0
                  ? data.notIncluded
                  : DEFAULT_NOT_INCLUDED,
              faqs:
                Array.isArray(data.faqs) && data.faqs.length > 0
                  ? data.faqs
                  : DEFAULT_FAQS,
            };}
