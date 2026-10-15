import destinations from "../official-destinations.json";
import { CHANNEL_CATEGORY_LINKS } from "../navigation.mjs";

export interface OfficialDestination {
  name: string;
  english: string;
  icon: string;
  cat: string;
  url: string;
  description: string;
  paid: boolean;
  destination: string;
}

export interface ChannelCategoryPage {
  slug: string;
  sourceCategory: string;
  label: string;
  navDescription: string;
  icon: string;
  h1: string;
  intro: string[];
  guidanceTitle: string;
  guidance: string[];
  items: OfficialDestination[];
}

/*
 * صفحات التصنيفات مشتقة حصراً من دليل المشاهدة الرسمية الظاهر في الصفحة
 * الرئيسية. لا نخمّن تصنيف الجهة ولا نضيف قنوات أو روابط بث من قوائم المزودين.
 */
const CATEGORY_COPY: Record<string, {
  h1: string;
  intro: string[];
  guidanceTitle: string;
  guidance: string[];
}> = {
  sports: {
    h1: "القنوات والمنصات الرياضية الرسمية",
    intro: [
      "تجمع هذه الصفحة الجهات المصنّفة «رياضة» في دليل المشاهدة الرسمية، مع رابط الموقع الرسمي لكل جهة للاطلاع على خيارات المتابعة المتاحة لديها.",
      "قد تختلف حقوق البث والباقات والتوفر بحسب الجهة والمنطقة. لا يستضيف الموقع محتوى رياضياً ولا يشغّل أو يعيد بث أي قناة.",
    ],
    guidanceTitle: "قبل اختيار جهة رياضية",
    guidance: [
      "تحقق لدى الموقع الرسمي من البطولة ونطاق المشاهدة المتاح في بلدك.",
      "راجع شروط الاشتراك والرسوم ومتطلبات الجهاز التي تعلنها الجهة.",
      "لا تستنتج توفر مباراة أو قناة بعينها من اسم التصنيف وحده.",
    ],
  },
  news: {
    h1: "القنوات والجهات الإخبارية الرسمية",
    intro: [
      "تضم القائمة الجهات المصنّفة «أخبار» في دليل المشاهدة الرسمية. انتقل إلى موقع الجهة نفسه لمعرفة طرق الوصول إلى أخبارها ومحتواها.",
      "تختلف خيارات المتابعة والتوفر الجغرافي من جهة إلى أخرى؛ لا يستضيف هذا الموقع الأخبار أو البث ولا يعيد بثهما.",
    ],
    guidanceTitle: "كيف تتحقق من خيارات الجهة الإخبارية؟",
    guidance: [
      "انتقل إلى موقع الجهة لمعرفة القنوات أو صفحات المتابعة التي تعلنها.",
      "راجع اللغة والمنطقة وطريقة المتابعة لدى المصدر نفسه.",
      "الإدراج هنا لا يعني أن لكل جهة بثاً مباشراً أو أن كل خدمة متاحة في كل بلد.",
    ],
  },
  movies: {
    h1: "قنوات الأفلام وروابط الجهات الرسمية",
    intro: [
      "تضم هذه الصفحة قنوات الأفلام المدرجة بهذا التصنيف في دليل المشاهدة الرسمية، مع روابط مواقع الجهات المالكة. القائمة دليل وصول وليست مشغّلاً للأفلام.",
      "المحتوى والحقوق وطرق المشاهدة والتوفر في منطقتك تحددها الجهة الرسمية نفسها؛ لا يعرض الموقع أفلاماً ولا يوفّر بثاً لها.",
    ],
    guidanceTitle: "ما الذي تعرضه قائمة الأفلام؟",
    guidance: [
      "القائمة تضم الجهات المصنّفة «أفلام» في الدليل، ولا تسرد مكتبات الأعمال أو عناوين متاحة للمشاهدة.",
      "تحقق من حقوق المشاهدة وتوفر الفيلم أو القناة مباشرةً من الموقع الرسمي للجهة.",
      "منصات المشاهدة الرقمية لها تصنيف مستقل باسم «منصات» ضمن روابط التصنيفات.",
    ],
  },
  entertainment: {
    h1: "قنوات الترفيه وروابطها الرسمية",
    intro: [
      "استكشف الجهات المصنّفة «ترفيه» في دليل المشاهدة الرسمية، وافتح موقع الجهة لمعرفة محتواها وخيارات الوصول التي تعلنها.",
      "قد تتغير البرامج وطرق المتابعة بحسب الجهة والمنطقة. تقتصر هذه الصفحة على دليل الروابط ولا تستضيف محتوى أو بثاً.",
    ],
    guidanceTitle: "قبل استكشاف جهة ترفيهية",
    guidance: [
      "راجع الموقع الرسمي لمعرفة البرامج والمحتوى الذي تعلنه الجهة حالياً.",
      "تحقق من خيارات الوصول والتوفر والرسوم لدى الجهة نفسها.",
      "وجود الجهة في الدليل لا يعني أن محتواها يُعرض أو يُشغّل على هذا الموقع.",
    ],
  },
  platforms: {
    h1: "منصات المشاهدة الرسمية وروابطها",
    intro: [
      "هذه قائمة بالمنصات المصنّفة «منصات» في دليل المشاهدة الرسمية. لكل منصة رابط إلى موقعها كي تطّلع على مكتبتها وشروطها بنفسك.",
      "المكتبات والاشتراكات والتوفر تختلف حسب المنصة والبلد؛ لا يبيع هذا الموقع اشتراكات المنصات ولا يستضيف محتواها أو يبثّه.",
    ],
    guidanceTitle: "ما الذي تراجعه قبل استخدام منصة؟",
    guidance: [
      "تحقق من مكتبة المنصة وخطط الاشتراك والتوفر في بلدك من موقعها الرسمي.",
      "راجع متطلبات الجهاز وشروط الاستخدام التي تنشرها المنصة نفسها.",
      "لا تفترض توفر عنوان أو باقة لمجرد ظهور اسم المنصة في الدليل.",
    ],
  },
  documentaries: {
    h1: "القنوات الوثائقية ومواقعها الرسمية",
    intro: [
      "تعرض الصفحة الجهات المصنّفة «وثائقيات» في دليل المشاهدة الرسمية وروابط مواقعها الأصلية، لتتحقق من البرامج وطرق المتابعة لدى كل جهة.",
      "تخضع إتاحة البرامج وشروطها للجهة صاحبة الحقوق والمنطقة. الموقع دليل روابط فقط ولا يشغّل أو يعيد بث المحتوى الوثائقي.",
    ],
    guidanceTitle: "كيف تتحقق من البرامج الوثائقية؟",
    guidance: [
      "استخدم موقع الجهة الرسمي للتحقق من البرامج والمواد التي تنشرها.",
      "راجع اللغة والترجمة وطرق المتابعة والتوفر في بلدك لدى الجهة نفسها.",
      "لا تفترض أن برنامجاً بعينه متاح لمجرد وجود الجهة في هذا التصنيف.",
    ],
  },
  kids: {
    h1: "قنوات الأطفال وروابط المشاهدة الرسمية",
    intro: [
      "تعرّف على الجهات المصنّفة «أطفال» في دليل المشاهدة الرسمية، وانتقل إلى مواقعها الأصلية للاطلاع على المحتوى المتاح وخيارات الوصول.",
      "قد تختلف البرامج والقيود العمرية والتوفر باختلاف الجهة والمنطقة؛ لا يستضيف الموقع محتوى الأطفال ولا يقدّم بثاً له.",
    ],
    guidanceTitle: "نقاط مفيدة للأهل قبل المتابعة",
    guidance: [
      "راجع التصنيف العمري وإعدادات الرقابة الأبوية التي توفرها الجهة أو التطبيق الرسمي.",
      "تحقق من لغة المحتوى وطريقة الوصول والتوفر في منطقتك لدى الجهة نفسها.",
      "الإدراج في الدليل لا يغني عن مراجعة ولي الأمر لشروط الجهة ومحتواها.",
    ],
  },
  music: {
    h1: "القنوات الموسيقية ومواقعها الرسمية",
    intro: [
      "تجمع القائمة الجهات المصنّفة «موسيقى» في دليل المشاهدة الرسمية. الروابط تقود إلى المواقع الأصلية حيث تُعلن كل جهة طرق الاستماع أو المشاهدة.",
      "تختلف الخدمات والتوفر بحسب الجهة والمنطقة. لا يشغّل هذا الموقع الموسيقى ولا يستضيفها أو يعيد بثها.",
    ],
    guidanceTitle: "تحقق من طريقة الاستماع الرسمية",
    guidance: [
      "افتح الموقع الرسمي للجهة لمعرفة ما إذا كانت تعلن خيار استماع أو مشاهدة مباشر.",
      "راجع التطبيقات وطرق التشغيل المعتمدة والتوفر الجغرافي لدى المصدر نفسه.",
      "استخدم الروابط التي تعلنها الجهة، ولا تفترض أن الإدراج يتضمن مشغّلاً أو رابط بث.",
    ],
  },
  religious: {
    h1: "القنوات الدينية وروابط الجهات الرسمية",
    intro: [
      "تضم الصفحة الجهات المصنّفة «دينية» في دليل المشاهدة الرسمية وروابط مواقعها، حيث يمكنك التحقق من برامجها وخيارات الوصول المنشورة لديها.",
      "هذه قائمة تعريفية بالجهات ومواقعها فقط؛ لا يستضيف الموقع المحتوى الديني أو يبثّه، وقد يختلف التوفر بحسب الجهة والمنطقة.",
    ],
    guidanceTitle: "تحقق من معلومات الجهة من مصدرها",
    guidance: [
      "راجع الموقع الرسمي لمعرفة البرامج والمواعيد وطرق المتابعة التي تعلنها الجهة.",
      "تحقق من اللغة والتوفر وخيارات الوصول من المصدر نفسه.",
      "لا تستنتج تفاصيل المحتوى من اسم الجهة أو تصنيفها وحده.",
    ],
  },
};

const officialDestinations = destinations as unknown as OfficialDestination[];
const registeredCategories = new Set(CHANNEL_CATEGORY_LINKS.map((category) => category.sourceCategory));

/* فحوص بيانات المصدر وقت التحميل: لا صفحات يتيمة ولا روابط بث أو حقول ناقصة. */
for (const destination of officialDestinations) {
  const requiredText = [destination.name, destination.english, destination.icon, destination.cat, destination.description, destination.destination];
  if (requiredText.some((value) => typeof value !== "string" || value.trim() === "")) {
    throw new Error(`Incomplete official destination record: ${destination.name || "unnamed"}`);
  }
  if (typeof destination.paid !== "boolean") {
    throw new Error(`Missing paid/free status for official destination: ${destination.name}`);
  }
  if (!registeredCategories.has(destination.cat)) {
    throw new Error(`Unregistered official destination category: ${destination.cat}`);
  }

  let officialUrl: URL;
  try {
    officialUrl = new URL(destination.url);
  } catch {
    throw new Error(`Invalid official destination URL: ${destination.name}`);
  }
  if (officialUrl.protocol !== "https:" || /\.m3u8?$/i.test(officialUrl.pathname)) {
    throw new Error(`Non-HTTPS or stream URL in official destinations: ${destination.name}`);
  }
}

export const CHANNEL_CATEGORY_PAGES: ChannelCategoryPage[] = CHANNEL_CATEGORY_LINKS.map((category) => {
  const copy = CATEGORY_COPY[category.slug];
  const items = officialDestinations.filter((destination) => destination.cat === category.sourceCategory);

  if (!copy) throw new Error(`Missing visible copy for channel category: ${category.slug}`);
  if (items.length === 0) throw new Error(`No official destinations for channel category: ${category.sourceCategory}`);

  return {
    slug: category.slug,
    sourceCategory: category.sourceCategory,
    label: category.label,
    navDescription: category.desc,
    icon: category.icon,
    h1: copy.h1,
    intro: copy.intro,
    guidanceTitle: copy.guidanceTitle,
    guidance: copy.guidance,
    items,
  };
});
