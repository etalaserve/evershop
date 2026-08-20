import { setPageMetaInfo } from '../../../../cms/services/pageMetaInfo.js';

export default (request) => {
  setPageMetaInfo(request, {
    title: 'Theme Builder',
    description: 'Customize your storefront colors, radius, and fonts'
  });
};
