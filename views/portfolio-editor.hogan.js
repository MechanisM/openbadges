{{#portfolio}}
<form class='portfolio' action='/share/{{group.attributes.url}}' method='post'>
  <input type='hidden' name='_csrf' value='{{csrfToken}}'>
  <input type='hidden' name='id' value='{{attributes.id}}'>
  <input type='hidden' name='group_id' value='{{group.attributes.id}}'>
  <input type='hidden' name='url' value='{{groups.attributes.url}}'>
  <header>
    <input tabindex=1 name='title' class='field title' value='{{attributes.title}}'>
    <input tabindex=1 name='subtitle' class='field subtitle' placeholder='Optional subtitle' value='{{attributes.subtitle}}'>
  </header>

  {{#attributes.preamble}}
  <section class='preamble'>
    <textarea tabindex=1 name='preamble' class='field preamble' placeholder='some information about this badge group'>{{attributes.preamble}}</textarea>
  </section>
  {{/attributes.preamble}}

  <ul class='badges'>
    {{#badges}}
      {{#attributes}}
        <li>
          {{#body}}
          <h3>{{badge.name}}</h3>
          
          <textarea name='stories[{{id}}]' tabindex=1 class='story' placeholder='some information about this badge'>{{_userStory}}</textarea>
          
          <table class='information'>
            <tr>
              <td rowspan="100" class='image'>
                <img src="{{image_path}}">
              </td>

              <td class='section-head' colspan='2'>Issuer Details</td>
            </tr>
            <tr>
              <td class='fieldlabel issuer-name'>Name</td>
              <td>{{badge.issuer.name}}</td>
            </tr>
            <tr>
              <td class='fieldlabel issuer-name'>URL</td>
              <td><a href={{badge.issuer.origin}}'>{{badge.issuer.origin}}</a></td>
            </tr>
            {{#badge.issuer.org}}
            <tr>
              <td class='fieldlabel issuer-name'>Organization</td>
              <td>{{badge.issuer.org}}</td>
            </tr>
            {{/badge.issuer.org}}

            <tr>
              <td class='section-head' colspan='2'>Badge Details</td>
            </tr>
            <tr>
              <td class='fieldlabel'>Name</td>
              <td>{{badge.name}}</td>
            </tr>
            <tr>
              <td class='fieldlabel'>Description</td>
              <td>{{badge.description}}</td>
            </tr>
            <tr>
              <td class='fieldlabel'>Criteria</td>
              <td><a href='{{badge.criteria}}'>{{badge.criteria}}</a></td>
            </tr>

            <tr>
              <td class='section-head' colspan='2'>Issuance Details</td>
            </tr>
            <tr>
              <td class='fieldlabel recipient'>Recipient</td>
              <td>{{recipient}}</td>
            </tr>
            <tr>
              <td class='fieldlabel evidence'>Evidence</td>
              <td><a href='{{evidence}}'>{{evidence}}</a></td>
            </tr>
            {{#issued_on}}
            <tr>
              <td class='fieldlabel'>Issued</td>
              <td>{{issued_on}}</td>
            </tr>
            {{/issued_on}}

            {{#expires}}
            <tr>
              <td class='fieldlabel'>Expiration</td>
              <td>{{expires}}</td>
            </tr>
            {{/expires}}

            {{/body}}
          </table>
        </li>
      {{/attributes}}
    {{/badges}}
  </ul>
  {{/portfolio}}
  
  <div class='save actions'>
    <input tabindex=1 class='btn btn-primary btn-large save' type='submit' value='Save this page'>
  </div>

  <script>
    $('form.portfolio').on('submit', function(e){
      e.preventDefault();
      return false;
    });
    $('input.save').on('click', function(e){
      $('form.portfolio')[0].submit();
    })
  </script>
</form>
